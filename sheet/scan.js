// Find the systems, staves and barlines on a scanned page of piano music, so a
// slice of the page can follow the music (sheet/README.md, approach 1, #049).
//
//   const page = detectPage({ data, width, height })     ({ stavesPerSystem: 2 } groups staves by count)
//   page.space                      staff-line spacing in pixels
//   page.systems[i].staves[j]       { top, bottom, x0, x1, lines: [y, ...] }
//   page.systems[i].barlines        [{ x, w }, ...] left to right, the system's
//                                   opening line and its final line included
//
// For clean engravings (the 1853 Bach-Gesellschaft page in sheet/scores/ is
// one), in plain JS on RGBA pixels so it runs in a page and in tests:
//  1. ink: Otsu's threshold on luma
//  2. staff lines: rows dark across most of the page's ink width; a staff is a
//     run of 5 lines at one spacing (the space)
//  3. systems: staves joined by the system's opening line at their left, top to bottom
//  4. barlines: columns dark over the whole height of every staff of the
//     system (a stem spans one staff at most, and seldom the whole of it) and
//     light just outside each staff (a long stem runs on past it); neighbouring
//     columns within a space are one barline (a repeat's thick and thin lines,
//     with its dots, are one)

export function luma(img) {
  const { data, width, height } = img, g = new Uint8Array(width * height)
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8
  return g
}

export function otsu(g) {
  const h = new Float64Array(256)
  for (const v of g) h[v]++
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * h[i]
  let wB = 0, sB = 0, best = 0, t = 128
  for (let i = 0; i < 256; i++) {
    wB += h[i]; if (!wB) continue
    const wF = g.length - wB; if (!wF) break
    sB += i * h[i]
    const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2
    if (v > best) { best = v; t = i }
  }
  return t
}

// rows of a vertical strip [xa, xb) that are dark across at least `frac` of it: [{ y, h, y0, y1 }]
function lineRows(ink, width, height, xa, xb, frac) {
  const need = frac * (xb - xa), lines = []
  let run = -1
  for (let y = 0; y <= height; y++) {
    let n = 0
    if (y < height) for (let x = xa, o = y * width; x < xb; x++) n += ink[o + x]
    if (y < height && n >= need) { if (run < 0) run = y }
    else if (run >= 0) { lines.push({ y: (run + y - 1) / 2, h: y - run, y0: run, y1: y - 1 }); run = -1 }
  }
  return lines
}

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0 }

// runs of 5 lines at one spacing: [[y, y, y, y, y], ...]
function fiveLines(lines, space) {
  const out = []
  for (let i = 0; i + 4 < lines.length; i++) {
    const ys = [lines[i].y]
    for (let j = i + 1; j < lines.length && ys.length < 5; j++) {
      const d = lines[j].y - ys[ys.length - 1]
      if (Math.abs(d - space) < space * 0.3) ys.push(lines[j].y)
      else if (d > space * 1.3) break
    }
    if (ys.length === 5) { out.push(ys); while (i + 1 < lines.length && lines[i + 1].y <= ys[4] + 0.5) i++ }
  }
  return out
}
function spaceOf(lines) {
  const gaps = lines.slice(1).map((l, i) => l.y - lines[i].y).filter(g => g > 3)
  // the commonest gap: a histogram, staff spaces outnumber every other gap
  const h = new Map()
  for (const g of gaps) { const k = Math.round(g); h.set(k, (h.get(k) || 0) + 1 + (h.get(k - 1) || 0) * 0 ) }
  let best = 0, n = 0
  for (const [k, c] of h) { const c3 = c + (h.get(k - 1) || 0) + (h.get(k + 1) || 0); if (c3 > n) { n = c3; best = k } }
  return best
}

// the row profile of a strip (share of dark pixels in each row), and the staves in it: for
// each row y, the worst of the five rows y + k·space (k = 0..4, each the darkest within a pixel)
// against the mean of the four rows halfway between them; peaks of that, a staff apart
function combStaves(ink, width, height, xa, xb, space) {
  const P = new Float32Array(height), w = xb - xa
  for (let y = 0; y < height; y++) { let n = 0; for (let x = xa, o = y * width; x < xb; x++) n += ink[o + x]; P[y] = n / w }
  const at = (y, f) => { const i = Math.round(y); return i < 1 || i >= height - 1 ? 0 : f(P[i - 1], P[i], P[i + 1]) }
  const hi = y => at(y, Math.max), lo = y => at(y, Math.min)
  const score = new Float32Array(height), lines = []
  for (let y = 1; y + 4 * space < height - 1; y++) {
    let mn = 1, mid = 0
    for (let k = 0; k < 5; k++) mn = Math.min(mn, hi(y + k * space))
    for (let k = 0; k < 4; k++) mid += lo(y + (k + 0.5) * space) / 4
    score[y] = mn >= 0.45 ? mn - mid : 0
  }
  const out = []
  for (let y = 1; y < height - 1; y++) {
    if (score[y] < 0.25) continue
    // (the best within half a space either way)
    let best = true
    for (let d = -Math.round(space * 0.5); d <= Math.round(space * 0.5) && best; d++) if (d && score[y + d] > score[y]) best = false
    if (!best) continue
    // each line at its own darkest row near where the comb put it
    const ys = []
    for (let k = 0; k < 5; k++) { let b = Math.round(y + k * space); for (let d = -2; d <= 2; d++) { const r = Math.round(y + k * space) + d; if (r > 0 && r < height && P[r] > P[b]) b = r } ys.push(b) }
    if (out.length && ys[0] - out.at(-1)[0] < space * 3) { if (score[y] > out.at(-1).s) out[out.length - 1] = Object.assign(ys, { s: score[y] }); continue }
    out.push(Object.assign(ys, { s: score[y] }))
  }
  return out
}

const lerpAt = (pts, x, k) => {
  if (pts.length === 1) return pts[0][k]
  let i = 0
  while (i < pts.length - 2 && x > pts[i + 1].x) i++
  const a = pts[i], b = pts[i + 1], t = (x - a.x) / (b.x - a.x)
  return a[k] + (b[k] - a[k]) * t
}

/**
 * The staves, followed across the page in vertical strips, so a page scanned
 * from a bound book (slanted, or bowed toward the spine) still reads: each
 * staff's top and bottom line are known at each strip's centre, and in between
 * by interpolation (staff.topAt(x), staff.bottomAt(x)).
 */
function findStaves(ink, width, height, { strips = 16, frac = 0.5 } = {}) {
  const sw = Math.floor(width / strips), per = []
  for (let s = 0; s < strips; s++) per.push({ x: s * sw + sw / 2, lines: lineRows(ink, width, height, s * sw, (s + 1) * sw, frac) })
  const space = median(per.map(p => spaceOf(p.lines)).filter(Boolean))
  if (!space) return { space: 0, staves: [] }
  // staff lines are thin: a beam (half a space thick) lying along the strip isn't one
  const lineH = median(per.flatMap(p => p.lines.map(l => l.h)))
  for (const p of per) p.lines = p.lines.filter(l => l.h <= Math.max(3, lineH * 1.8, space * 0.25))
  // the staves in each strip: five rows one space apart, each dark across most of the strip,
  // with lighter rows between them (combStaves); a beam lying over the lines merges with
  // them into one thick dark run, which the runs above leave out but the comb still reads
  for (let s = 0; s < strips; s++) per[s].staves = combStaves(ink, width, height, s * sw, (s + 1) * sw, space).map(ys => ({ x: per[s].x, top: ys[0], bottom: ys[4], lines: ys }))
  // a staff is a run of strips that found five lines at about the same height (a strip
  // can miss one under a beam, a slur or the brace): each strip's staves joined to the
  // nearest staff found so far, across the page from left to right
  const tracks = []
  for (const p of per) for (const st of p.staves) {
    let best = null, d = space * 1.5
    for (const tr of tracks) { const l = tr.at(-1), e = Math.abs(l.top - st.top) + Math.abs(l.bottom - st.bottom); if (l.x < st.x && e < d) { d = e; best = tr } }
    if (best) best.push(st); else tracks.push([st])
  }
  const staves = tracks.filter(tr => tr.length >= Math.max(3, strips * 0.25)).map(tr => {
    const pts = [...tr]
    pts.sort((a, b) => a.x - b.x)
    // keep the strips that agree on one straight staff (a strip can mistake a
    // ledger line for the top line, and so read the staff a space off)
    let best = pts, err = Infinity
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], k = (b.top - a.top) / (b.x - a.x)
      const ins = pts.filter(p => Math.abs(a.top + k * (p.x - a.x) - p.top) < space * 0.35 && Math.abs(a.bottom + k * (p.x - a.x) - p.bottom) < space * 0.5)
      const e = ins.reduce((s, p) => s + Math.abs(a.top + k * (p.x - a.x) - p.top), 0)
      if (ins.length > best.length || (ins.length === best.length && e < err) || best === pts) { if (ins.length >= 2) { best = ins; err = e } }
    }
    if (pts.length > 2) pts.splice(0, pts.length, ...best)
    return { pts, topAt: x => lerpAt(pts, x, 'top'), bottomAt: x => lerpAt(pts, x, 'bottom') }
  }).sort((a, b) => a.topAt(width / 2) - b.topAt(width / 2))
  return { space, staves }
}

// the staff's horizontal extent: the longest run of ink along its middle line, gaps under a space bridged
function staffExtent(ink, width, staff, space) {
  let best = [0, 0], start = -1, last = -1
  for (let x = 0; x < width; x++) {
    const y = Math.round((staff.topAt(x) + staff.bottomAt(x)) / 2)
    let on = false
    for (let d = -3; d <= 3 && !on; d++) on = !!ink[(y + d) * width + x]
    if (on) { if (start < 0 || x - last > space * 2) start = x; last = x; if (last - start > best[1] - best[0]) best = [start, last] }
  }
  return best
}

export function detectPage(img, { stavesPerSystem = 0, threshold } = {}) {
  const { width, height } = img
  const g = luma(img), t = threshold ?? otsu(g)
  const ink = new Uint8Array(g.length)
  for (let i = 0; i < g.length; i++) ink[i] = g[i] <= t ? 1 : 0
  const { space, staves: found } = findStaves(ink, width, height)
  const staves = found.map(st => {
    const [x0, x1] = staffExtent(ink, width, st, space)
    const mid = (x0 + x1) / 2
    return { top: st.topAt(mid), bottom: st.bottomAt(mid), x0, x1, topAt: st.topAt, bottomAt: st.bottomAt, pts: st.pts.map(p => [p.x, p.top, p.bottom]) }
  })
  // systems: staves joined by the line at their left (the system's opening barline, which
  // runs through the gap between its staves), so a system of three staves (the Goldberg's
  // hand-crossing variations) reads as one; `stavesPerSystem` groups by count instead
  const groups = [], opens = []
  if (stavesPerSystem) for (let i = 0; i + stavesPerSystem <= staves.length; i += stavesPerSystem) groups.push(staves.slice(i, i + stavesPerSystem))
  else for (const st of staves) {
    const last = groups.at(-1)?.at(-1)
    const x = last ? joined(ink, width, height, last, st, space) : -1
    if (x >= 0) { groups.at(-1).push(st); opens[groups.length - 1] ??= x }
    else groups.push([st])
  }
  const systems = []
  for (const [gi, st] of groups.entries()) {
    // (a lone staff is a stray: a heading's rule, an ossia; every system here has two staves or more)
    if (st.length < 2) continue
    // where the opening line was found it is the system's left end (a staff's ink run can
    // reach past it, into a pencil mark in the margin)
    const x0 = opens[gi] ?? Math.min(...st.map(s => s.x0)), x1 = Math.max(...st.map(s => s.x1))
    systems.push({ staves: st, x0, x1, top: st[0].top, bottom: st[st.length - 1].bottom, barlines: barlines(ink, width, height, st, x0, x1, space) })
  }
  return { width, height, threshold: t, space, systems, staves }
}

// is staff b in the same system as staff a, above it: a column near their left ends dark
// through most of the gap between them
function joined(ink, width, height, a, b, space) {
  const at = (x, y) => ink[Math.round(y) * width + x]
  const lo = Math.min(a.x0, b.x0) - Math.round(space * 1.2), hi = Math.max(a.x0, b.x0) + Math.round(space * 5)
  for (let x = Math.max(0, lo); x <= Math.min(width - 1, hi); x++) {
    const y0 = a.bottomAt(x), y1 = b.topAt(x)
    if (!(y1 > y0)) continue
    let n = 0, m = 0
    for (let y = Math.ceil(y0); y <= Math.floor(y1); y++, m++) n += at(x, y) | (x > 0 ? at(x - 1, y) : 0) | (x < width - 1 ? at(x + 1, y) : 0)
    if (m && n / m >= 0.85) return x
  }
  return -1
}

function barlines(ink, width, height, staves, x0, x1, space) {
  const at = (x, y) => (x >= 0 && x < width && y >= 0 && y < height) ? ink[Math.round(y) * width + (x | 0)] : 0
  // the share of [y0, y1] dark at x (a pixel either side allowed, for a slanted scan)
  const dark = (x, y0, y1) => {
    let n = 0, m = 0
    for (let y = Math.ceil(y0); y <= Math.floor(y1); y++, m++) n += at(x - 1, y) | at(x, y) | at(x + 1, y)
    return m ? n / m : 0
  }
  const cand = []
  for (let x = Math.max(0, x0 - Math.round(space)); x <= Math.min(width - 1, x1 + Math.round(space)); x++) {
    if (!staves.every(s => dark(x, s.topAt(x), s.bottomAt(x)) >= 0.9)) continue
    // light just outside a staff, above or below (a stem running on past the staff isn't a barline)
    const out = staves.map(s => {
      let up = 0, dn = 0, k = 0
      for (let d = Math.round(space * 0.7); d <= Math.round(space * 1.5); d++, k++) { up += at(x, s.topAt(x) - d); dn += at(x, s.bottomAt(x) + d) }
      return Math.min(up, dn) / k
    })
    // and the gap between staves: a grand staff's barlines often run through it
    let gap = 1
    for (let i = 0; i + 1 < staves.length; i++) gap = Math.min(gap, dark(x, staves[i].bottomAt(x), staves[i + 1].topAt(x)))
    cand.push({ x, out: Math.max(...out), gap })
  }
  // where most barlines run through the gap (engraved grand staves), only those count:
  // that leaves out time signatures, and stems that happen to line up in both staves
  const groups = join(cand, space)
  const through = groups.filter(g => g.gap >= 0.85).length > groups.length / 2
  return groups.filter(g => through ? g.gap >= 0.85 : g.out <= 0.4).map(g => ({ x: g.x, w: g.w }))
}
// columns within a space of each other are one barline (a repeat's thick and thin lines, with its dots)
function join(cand, space) {
  const out = []
  for (const c of cand) {
    const b = out[out.length - 1]
    if (b && c.x - b.x1 <= space) { b.x1 = c.x; b.gap = Math.max(b.gap, c.gap); b.out = Math.min(b.out, c.out) }
    else out.push({ x0: c.x, x1: c.x, gap: c.gap, out: c.out })
  }
  return out.map(b => ({ ...b, x: (b.x0 + b.x1) / 2, w: b.x1 - b.x0 + 1 }))
}

/**
 * The page as bars: for each system, its bars as [x0, x1] between barlines,
 * numbered on from `first` (1 by default). The system's opening line is added
 * where the scan doesn't show one (a single staff), at the staff's start.
 */
export function barsOf(page) {
  let n = 0
  return page.systems.map(s => {
    const xs = s.barlines.map(b => b.x)
    if (!xs.length || xs[0] - s.x0 > page.space * 1.5) xs.unshift(s.x0)
    if (s.x1 - xs[xs.length - 1] > page.space * 1.5) xs.push(s.x1)
    const bars = []
    for (let i = 0; i + 1 < xs.length; i++) if (xs[i + 1] - xs[i] > page.space * 2) bars.push({ bar: ++n, x0: xs[i], x1: xs[i + 1] })
    return bars
  })
}
