// Fabric finishes for the #032 pianist's dresses: one switch that restyles
// any garment material (our knit dress or a community one).
//
//  • as made  — the garment's own material (the knit for ours);
//  • satin    — smooth, low roughness, a bright sheen;
//  • velvet   — rough, deep, a strong coloured sheen at grazing angles;
//  • sequins  — concert stage dresses: a tiled normal map of small
//    overlapping discs, each tilted at random, on a metallic, glossy base,
//    so every disc catches the spotlight at its own angle and the dress
//    glitters as she moves. Tiled in the garment's own UVs; `scale` sets the
//    tiles per UV unit (community UVs span 0–1, ours run in 5.6 cm tiles).
//
// More finishes (#047), each a set of material values plus, where the cloth
// has a surface you can see, a procedural tile (height → normal map, and a
// roughness map where the weave's shine varies):
//  • silk     — charmeuse: glossy, the highlight stretched along the threads
//    (anisotropic), a soft sheen;
//  • chiffon  — matte and soft, the bright haze at the edges a sheer layer
//    gives (sheen near 1, rough); not see-through: the body under a garment
//    is hidden, so a real transparency would show holes;
//  • crepe    — a dry pebbly surface, almost no shine;
//  • taffeta  — crisp fine ribs, a shot-silk shift of colour (iridescence);
//  • damask   — tone on tone: satin medallions on a matte ground (a
//    roughness map), lightly raised;
//  • lamé     — metallic threads in a fine plain weave;
//  • glitter  — tiny metallic facets, each at its own angle, finer than sequins;
//  • beaded   — a grid of glass beads, glossy and domed;
//  • leather  — a pebbled grain, a light satin finish (for the jumpsuit or a top);
//  • lace     — illusion lace, as on concert and red-carpet gowns: a
//    Chantilly-style lace (corded rosettes and leaves on a fine tulle net)
//    over a lining in her skin tone, so it reads as see-through. The body
//    under a garment is hidden (real holes would show nothing behind), so
//    the lining is drawn instead: a shader mixes the dress colour (and its
//    texture) with the lining colour by the lace's coverage — 1 on the
//    motifs and cords, ¾ on the net threads, 0.3 in the tulle between (a fine
//    net tints the skin under it: black tulle over nude reads smoky). setLaceLining() sets the colour for
//    every lace garment (#047 follows her skin). The path tracers drop shader
//    patches, so a garment also carries a CPU bake of the same mix (traceMap)
//    that pathtrace/snapshot.js uses in its place;
//  • pleated  — vertical knife pleats, ~2.3 cm (plissé is finer, ~1 cm, and
//    disappears at full length). Our
//    dresses' UVs run round the body (u), so for them it is a normal map;
//    a community garment's UVs are an arbitrary atlas, so there the pleats
//    are put in the shader from each vertex's angle round her body axis in
//    the rest pose (skinned like the normal), with the crease darkened.
//    The path tracers drop shader patches, so they trace that kind unpleated.

import * as THREE from 'three'

let sequinTex = null
function sequinNormal(size = 256, cells = 16) {
  if (sequinTex) return sequinTex
  let s = 31; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data
  for (let i = 0; i < d.length; i += 4) { d[i] = 128; d[i + 1] = 128; d[i + 2] = 255; d[i + 3] = 255 }
  const cw = size / cells, rad = cw * 0.62
  // rows overlap like scales: draw top row first, later rows on top
  for (let row = 0; row < cells; row++) for (let col = 0; col < cells; col++) {
    const cx = (col + (row % 2) * 0.5) * cw, cy = row * cw
    const tx = (r() - 0.5) * 1.1, ty = (r() - 0.5) * 1.1 - 0.25
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const dx = x - cx, dy = y - cy, q = (dx * dx + dy * dy) / (rad * rad)
      if (q > 1) continue
      // a flat disc, tilted, with a dark rim (the gap to the next one)
      let nx = tx, ny = ty, nz = 1
      if (q > 0.8) { nx += dx / rad * 1.5; ny += dy / rad * 1.5 }
      const l = Math.hypot(nx, ny, nz), i = (((y + size) % size) * size + ((x + size) % size)) * 4
      d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (nz / l * 0.5 + 0.5) * 255
    }
  }
  g.putImageData(img, 0, 0)
  sequinTex = new THREE.CanvasTexture(c)
  sequinTex.wrapS = sequinTex.wrapT = THREE.RepeatWrapping
  sequinTex.colorSpace = THREE.NoColorSpace
  sequinTex.anisotropy = 8
  return sequinTex
}

// a tile from a height field h(x, y) (0–1, x and y in 0–1, wrapping):
// { normal, rough } textures, rough from rough(x, y, h) when given
const tiles = {}
function heightTile(key, size, h, { strength = 2, rough = null } = {}) {
  if (tiles[key]) return tiles[key]
  const H = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = h(x / size, y / size)
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)]
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); return [c, g, g.createImageData(size, size)] }
  const [cn, gn, imn] = mk(), [cr, gr, imr] = rough ? mk() : []
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (at(x - 1, y) - at(x + 1, y)) * strength, ny = (at(x, y - 1) - at(x, y + 1)) * strength
    const l = Math.hypot(nx, ny, 1), i = (y * size + x) * 4
    imn.data[i] = (nx / l * 0.5 + 0.5) * 255; imn.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; imn.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; imn.data[i + 3] = 255
    if (rough) { const v = Math.max(0, Math.min(1, rough(x / size, y / size, H[y * size + x]))) * 255; imr.data[i] = imr.data[i + 1] = imr.data[i + 2] = v; imr.data[i + 3] = 255 }
  }
  gn.putImageData(imn, 0, 0); if (rough) gr.putImageData(imr, 0, 0)
  const tex = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return t }
  return (tiles[key] = { normal: tex(cn), rough: rough ? tex(cr) : null })
}
// seeded hash and value noise (tileable over `per` cells)
const hash = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v) }
const smooth = t => t * t * (3 - 2 * t)
function vnoise(x, y, per, s = 0) {
  const X = x * per, Y = y * per, i = Math.floor(X), j = Math.floor(Y), fx = smooth(X - i), fy = smooth(Y - j)
  const w = k => ((k % per) + per) % per
  const a = hash(w(i), w(j), s), b = hash(w(i + 1), w(j), s), c = hash(w(i), w(j + 1), s), d = hash(w(i + 1), w(j + 1), s)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
const TILES = {
  crepe: () => heightTile('crepe', 256, (x, y) => 0.6 * vnoise(x, y, 48, 1) + 0.4 * vnoise(x, y, 96, 2), { strength: 1.4 }),
  taffeta: () => heightTile('taffeta', 256, (x, y) => 0.5 + 0.5 * Math.sin(y * 2 * Math.PI * 96) * (0.8 + 0.2 * vnoise(x, y, 16, 3)), { strength: 0.9 }),
  chiffon: () => heightTile('chiffon', 128, (x, y) => 0.5 + 0.25 * Math.sin(x * 2 * Math.PI * 32) + 0.25 * Math.sin(y * 2 * Math.PI * 32) + 0.15 * vnoise(x, y, 32, 4), { strength: 0.8 }),
  lame: () => heightTile('lame', 256, (x, y) => { const u = x * 32, v = y * 32, cu = Math.floor(u), cv = Math.floor(v); const warp = (cu + cv) % 2 ? Math.sin((v - cv) * Math.PI) : Math.sin((u - cu) * Math.PI); return 0.5 + 0.5 * warp }, { strength: 2.5 }),
  // tiny flat facets, each tilted its own way (as height ramps per cell)
  glitter: () => heightTile('glitter', 256, (x, y) => { const n = 64, i = Math.floor(x * n), j = Math.floor(y * n), fx = x * n - i, fy = y * n - j; return 0.5 + 0.35 * ((hash(i, j, 5) - 0.5) * fx + (hash(i, j, 6) - 0.5) * fy) }, { strength: 9 }),
  beaded: () => heightTile('beaded', 256, (x, y) => { const n = 24, fx = (x * n) % 1 - 0.5, fy = (y * n + 0.5 * (Math.floor(x * n) % 2)) % 1 - 0.5, r = Math.hypot(fx, fy) / 0.45; return r < 1 ? Math.sqrt(1 - r * r) : 0 }, { strength: 2.2 }),
  // medallions in a half-drop repeat: an eight-petalled rosette in a lozenge
  damask: () => {
    const motif = (x, y) => {
      const n = 2, u = x * n, v = y * n + 0.5 * (Math.floor(x * n) % 2), fx = u % 1 - 0.5, fy = v % 1 - 0.5
      const r = Math.hypot(fx, fy), a = Math.atan2(fy, fx)
      const petal = r < 0.18 + 0.12 * Math.abs(Math.cos(4 * a)) ? 1 : 0
      const ring = Math.abs(r - 0.36) < 0.025 ? 1 : 0
      const leaf = Math.abs(fx) + Math.abs(fy) > 0.42 && Math.abs(fx) + Math.abs(fy) < 0.48 ? 1 : 0
      return Math.max(petal, ring, leaf)
    }
    return heightTile('damask', 512, (x, y) => 0.15 * vnoise(x, y, 128, 7) + 0.85 * motif(x, y), { strength: 2, rough: (x, y, h) => h > 0.5 ? 0.18 : 0.95 })
  },
  // leather grain: cells of a Voronoi field, creased at their edges
  leather: () => heightTile('leather', 256, (x, y) => {
    const n = 24, X = x * n, Y = y * n, i = Math.floor(X), j = Math.floor(Y); let d1 = 9, d2 = 9
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const ci = ((i + a) % n + n) % n, cj = ((j + b) % n + n) % n, px = i + a + hash(ci, cj, 8), py = j + b + hash(ci, cj, 9), d = Math.hypot(X - px, Y - py); if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d }
    return Math.min(1, (d2 - d1) * 2.2)
  }, { strength: 1.6 }),
}
// lace: { normal, rough, color } tiles of one 512² repeat
let laceTiles = null
function lace() {
  if (laceTiles) return laceTiles
  const S = 512
  // what each texel is: 3 cord, 2 toile (the motif's dense fill), 1 net, 0 gap
  const field = (x, y) => {
    // hexagonal net: three families of lines, 24 cells across
    const n = 24, px = x * n, py = y * n * 0.866
    const line = d => { const f = d - Math.floor(d); return Math.min(f, 1 - f) }
    const net = Math.min(line(px), line(px * 0.5 + py), line(px * 0.5 - py)) < 0.07 ? 1 : 0
    // two rosettes a tile (half-drop), five petals, with leaves on a vine
    let best = 0
    // large rosettes on the diagonal, small ones between (k: their size)
    for (const [bx, by, k] of [[0.25, 0.25, 1], [0.75, 0.75, 1], [0.75, 0.25, 0.62], [0.25, 0.75, 0.62]]) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const fx = (x - bx - ox) / k, fy = (y - by - oy) / k, r = Math.hypot(fx, fy); if (r > 0.3) continue
      const a = Math.atan2(fy, fx)
      // five round petals (a gap of net between them), a corded edge, a seeded
      // centre; a scalloped corded ring, and a band of dense toile round it
      const edge = 0.06 + 0.14 * Math.pow(Math.abs(Math.cos(2.5 * a)), 0.6)
      const ringR = 0.25 + 0.012 * Math.cos(10 * a)
      if (r < 0.035) best = Math.max(best, 3)
      else if (r < 0.048) best = Math.max(best, 1)
      else if (r < edge) best = Math.max(best, edge - r < 0.012 / k ? 3 : 2)
      else if (Math.abs(r - ringR) < 0.01 / k) best = Math.max(best, 3)
      else if (r > ringR && r < ringR + 0.035 && Math.cos(20 * a) > -0.2) best = Math.max(best, 2)
    }
    // the vine between them, with leaves either side
    const vy = y - 0.5 - 0.12 * Math.sin(x * 2 * Math.PI * 2)
    if (Math.abs(vy) < 0.008) best = Math.max(best, 3)
    for (let k = 0; k < 8; k++) {
      const lx = (k + 0.5) / 8, ly = 0.5 + 0.12 * Math.sin(lx * 2 * Math.PI * 2) + (k % 2 ? 0.045 : -0.045)
      const dx = (x - lx) / 0.05, dy = (y - ly) / 0.026, d = dx * dx + dy * dy
      if (d < 1) best = Math.max(best, d > 0.65 ? 3 : 2)
    }
    return best || net
  }
  const F = new Uint8Array(S * S)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) F[y * S + x] = field(x / S, y / S)
  // per texel kind (gap, net, toile, cord): relief, roughness (the lining
  // between is matte jersey), coverage (how much lace hides the lining) and
  // the lace's own shade (the cords catch light, the net is finer)
  const HEIGHT = [0, 0.3, 0.55, 1], ROUGH = [0.72, 0.8, 0.8, 0.85], COVER = [0.3, 0.75, 1, 1], SHADE = [1, 0.85, 0.93, 1]
  const blur = arr => { const o = new Float32Array(S * S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += arr[((y + j + S) % S) * S + ((x + i + S) % S)]; o[y * S + x] = s / 9 } return o }
  const H = blur(Float32Array.from(F, f => HEIGHT[f]))
  const at = (x, y) => H[((y + S) % S) * S + ((x + S) % S)]
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); return [c, g, g.createImageData(S, S)] }
  const [cn, gn, n] = mk(), [cr, gr, r] = mk(), [cc, gc, c] = mk()
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, f = F[y * S + x]
    const nx = (at(x - 1, y) - at(x + 1, y)) * 3, ny = (at(x, y - 1) - at(x, y + 1)) * 3, l = Math.hypot(nx, ny, 1)
    n.data[i] = (nx / l * 0.5 + 0.5) * 255; n.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; n.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; n.data[i + 3] = 255
    r.data[i] = r.data[i + 1] = r.data[i + 2] = ROUGH[f] * 255; r.data[i + 3] = 255
    // the mask: coverage in r, the lace's shade in g (blurred a texel: soft cord edges)
    c.data[i] = COVER[f] * 255; c.data[i + 1] = SHADE[f] * 255; c.data[i + 2] = 0; c.data[i + 3] = 255
  }
  gn.putImageData(n, 0, 0); gr.putImageData(r, 0, 0); gc.putImageData(c, 0, 0)
  const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t }
  // (coverage and shade per texel, for the CPU bake)
  const cover = Float32Array.from(F, f => COVER[f]), shade = Float32Array.from(F, f => SHADE[f])
  return (laceTiles = { normal: tex(cn), rough: tex(cr), mask: tex(cc), S, cover, shade })
}
function smoothstep(x, a, b) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// the lining colour, shared by every lace garment
export const laceLining = { value: new THREE.Color('#d6a88f') }
export function setLaceLining(c) { laceLining.value.set(c); bakeEpoch++ }
let bakeEpoch = 0
const LACE_SHADER = {
  vertexHead: 'uniform mat3 uLaceT;\nvarying vec2 vLaceUv;\n',
  vertex: '\n\tvLaceUv = (uLaceT * vec3(uv, 1.0)).xy;',
  fragmentHead: 'uniform sampler2D uLaceMask;\nuniform vec3 uLaceLining;\nvarying vec2 vLaceUv;\n',
  // the lining under the lace keeps the garment texture's light and shade (its folds), not its colour
  color: `
    { vec2 lm = texture2D(uLaceMask, vLaceUv).rg;
      vec3 lb = vec3(1.0);
      #ifdef USE_MAP
        lb = vec3(dot(sampledDiffuseColor.rgb, vec3(0.3, 0.59, 0.11)) * 1.6);
      #endif
      diffuseColor.rgb = mix(uLaceLining * lb, diffuseColor.rgb * lm.g, lm.r); }`,
}
function laceShader(m, k) {
  const L = lace(), T = new THREE.Matrix3().setUvTransform(0, 0, k, k, 0, 0, 0)
  const u = { uLaceT: { value: T }, uLaceMask: { value: L.mask }, uLaceLining: laceLining }
  m.userData.fabricShader = 'lace'
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = LACE_SHADER.vertexHead + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>' + LACE_SHADER.vertex)
    sh.fragmentShader = LACE_SHADER.fragmentHead + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>' + LACE_SHADER.color)
  }
  m.customProgramCacheKey = () => 'lace'
}
// the same mix on the CPU into a texture (colour white): for the path tracers
const toLin = c => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const toSrgb = c => 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)
function laceBake(m, k) {
  const st = state(m), key = `${m.color.getHexString()}|${laceLining.value.getHexString()}|${bakeEpoch}|${m.map?.uuid}|${k}`
  if (st.bake?.key === key) return st.bake.tex
  st.bake?.tex.dispose()
  const L = lace(), base = m.map?.image, flip = m.map ? m.map.flipY !== false : true
  // ours (no map): one tile, repeated k times; theirs: the whole atlas
  const W = base ? Math.min(2048, Math.max(1024, base.width || 1024)) : L.S, H = base ? Math.round(W * (base.height || W) / (base.width || W)) : L.S
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })
  let B = null
  if (base) { g.drawImage(base, 0, 0, W, H); B = g.getImageData(0, 0, W, H).data }
  const out = g.createImageData(W, H), O = out.data
  const col = m.color, lin = laceLining.value, S = L.S, kk = base ? k : 1
  for (let y = 0; y < H; y++) {
    const v = flip ? 1 - (y + 0.5) / H : (y + 0.5) / H, tv = v * kk - Math.floor(v * kk), ty = Math.min(S - 1, Math.floor((1 - tv) * S))
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W, tu = u * kk - Math.floor(u * kk), tx = Math.min(S - 1, Math.floor(tu * S)), t = ty * S + tx, i = (y * W + x) * 4
      const cov = L.cover[t], sh = L.shade[t]
      const br = B ? toLin(B[i]) : 1, bg = B ? toLin(B[i + 1]) : 1, bb = B ? toLin(B[i + 2]) : 1
      const lum = B ? Math.min(1, (0.3 * br + 0.59 * bg + 0.11 * bb) * 1.6) : 1
      O[i] = toSrgb(cov * col.r * br * sh + (1 - cov) * lin.r * lum)
      O[i + 1] = toSrgb(cov * col.g * bg * sh + (1 - cov) * lin.g * lum)
      O[i + 2] = toSrgb(cov * col.b * bb * sh + (1 - cov) * lin.b * lum)
      O[i + 3] = 255
    }
  }
  g.putImageData(out, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8
  if (m.map) { tex.flipY = m.map.flipY; tex.wrapS = m.map.wrapS; tex.wrapT = m.map.wrapT } else tex.repeat.set(k, k)
  st.bake = { key, tex }
  return tex
}

// a material's fabric state, kept off the material: userData is deep-copied
// (JSON) by every clone, and a texture there is serialised, image and all
const STATE = new WeakMap()
const state = m => { let s = STATE.get(m); if (!s) STATE.set(m, s = {}); return s }
/** a copy of a material (look.js's stylized / cel swaps) shares its source's fabric state */
export const linkFabric = (copy, src) => { const s = STATE.get(src); if (s) STATE.set(copy, s) }
/** the map a fabric put on m (ours to dispose of), or null */
export const fabricMapOf = m => STATE.get(m)?.map || null

// pleats along u (our dresses): 8 knife pleats a tile, a long face and a sharp turn
const pleatTile = () => heightTile('pleat', 256, x => { const f = (x * 8) % 1; return f < 0.82 ? f / 0.82 : (1 - f) / 0.18 }, { strength: 1.4 })
// the crease's shade (colour), for garments with no map of their own
let pleatShade = null
function pleatShadeTile() {
  if (pleatShade) return pleatShade
  const c = document.createElement('canvas'); c.width = 256; c.height = 4
  const g = c.getContext('2d'), im = g.createImageData(256, 4)
  for (let x = 0; x < 256; x++) {
    const f = (x / 256 * 8) % 1, d = Math.min(f, Math.abs(0.82 - f)), v = 255 * (0.74 + 0.26 * smoothstep(d, 0, 0.1))
    for (let y = 0; y < 4; y++) { const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255 }
  }
  g.putImageData(im, 0, 0)
  pleatShade = new THREE.CanvasTexture(c); pleatShade.wrapS = pleatShade.wrapT = THREE.RepeatWrapping; pleatShade.colorSpace = THREE.SRGBColorSpace
  return pleatShade
}
// …and in the shader (community garments)
const PLEAT_SHADER = {
  vertexHead: 'uniform vec2 uPleatC;\nvarying float vPleatA;\nvarying vec3 vPleatT;\n',
  vertex: `
    vec2 pleatR = position.xz - uPleatC;
    vPleatA = atan(pleatR.x, pleatR.y);
    vec3 pleatT = vec3(pleatR.y, 0.0, -pleatR.x);
    #ifdef USE_SKINNING
      pleatT = (skinMatrix * vec4(pleatT, 0.0)).xyz;
    #endif
    vPleatT = normalize(normalMatrix * pleatT + 1e-6);`,
  fragmentHead: 'uniform float uPleatN, uPleatDepth;\nvarying float vPleatA;\nvarying vec3 vPleatT;\nfloat pleatF() { return fract(vPleatA * uPleatN / 6.2831853); }\n',
  // the long face tilts one way, the short turn the other; the crease is darker
  normal: `
    { float pf = pleatF(); float tilt = pf < 0.82 ? 0.35 : -1.3;
      vec3 tv = vPleatT - dot(vPleatT, normal) * normal;
      normal = normalize(normal + normalize(tv + 1e-6) * tilt * uPleatDepth); }`,
  color: `
    { float pf = pleatF(); diffuseColor.rgb *= 0.78 + 0.22 * smoothstep(0.0, 0.12, min(pf, 0.82 - pf + 0.18) ); }`,
}
function pleatShader(m, center, count = 44) {
  const u = { uPleatC: { value: new THREE.Vector2(...center) }, uPleatN: { value: count }, uPleatDepth: { value: 1 } }
  m.userData.fabricShader = 'pleat'
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = PLEAT_SHADER.vertexHead + sh.vertexShader.replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>' + PLEAT_SHADER.vertex)
    sh.fragmentShader = PLEAT_SHADER.fragmentHead + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + PLEAT_SHADER.normal)
      .replace('#include <color_fragment>', '#include <color_fragment>' + PLEAT_SHADER.color)
  }
  m.customProgramCacheKey = () => 'pleat'
}

// tiles per garment UV unit, against the sequins' (cloth with a fine
// surface repeats more; damask's medallions are large)
const REPEAT = { crepe: 1, taffeta: 0.8, lame: 1.2, glitter: 1.5, beaded: 1.2, damask: 1, leather: 2, chiffon: 2, lace: 1.4, pleated: 0.6 }

const KEYS = ['roughness', 'metalness', 'sheen', 'sheenRoughness', 'clearcoat', 'clearcoatRoughness', 'specularIntensity', 'iridescence', 'iridescenceIOR', 'anisotropy', 'anisotropyRotation']

/** Restyle materials. mats: [{ material, scale }]; kind: one of FABRIC_KINDS. */
export const FABRIC_KINDS = ['made', 'satin', 'velvet', 'sequin', 'silk', 'chiffon', 'crepe', 'taffeta', 'damask', 'lame', 'glitter', 'beaded', 'leather', 'lace', 'pleated']
// mats: [{ material, scale, around, center }]: around 'u' when the garment's
// u runs round the body (ours), else the pleats go in the shader about
// center ([x, z] of her body axis in the garment's rest coordinates)
/** the texture a path tracer should use for m in place of map × colour (lace), or null */
export const traceMapOf = m => STATE.get(m)?.trace?.() || null
export function applyFabric(mats, kind = 'made') {
  for (const { material: m, scale = 1, around = null, center = [0, 0] } of mats) {
    const st = state(m)
    const o = (st.orig ||= { ...Object.fromEntries(KEYS.map(k => [k, m[k]])), normalMap: m.normalMap, normalScale: m.normalScale.clone(), roughnessMap: m.roughnessMap, iridescenceThicknessRange: [...m.iridescenceThicknessRange], onBeforeCompile: m.onBeforeCompile, customProgramCacheKey: m.customProgramCacheKey })
    for (const k of KEYS) m[k] = o[k]
    if (m.normalMap !== o.normalMap) m.normalMap?.dispose()
    if (m.roughnessMap !== o.roughnessMap) m.roughnessMap?.dispose()
    m.normalMap = o.normalMap; m.normalScale.copy(o.normalScale); m.roughnessMap = o.roughnessMap
    m.iridescenceThicknessRange = [...o.iridescenceThicknessRange]
    // what an earlier fabric added beyond plain values: a map, a shader, a bake
    if (st.map) { if (m.map === st.map) m.map = st.mapBase; st.map.dispose(); st.map = st.mapBase = null }
    if (m.userData.fabricShader) { m.onBeforeCompile = o.onBeforeCompile; m.customProgramCacheKey = o.customProgramCacheKey; delete m.userData.fabricShader }
    st.bake?.tex.dispose(); st.bake = null; st.trace = null
    delete m.userData.traceMap
    // a fabric's own tile, tiled like the sequins (scale) times its REPEAT
    const tile = TILES[kind]?.()
    if (tile) {
      const t = tile.normal.clone(), k = scale * REPEAT[kind]
      t.repeat.set(k, k); t.needsUpdate = true
      m.normalMap = t; m.normalScale.set(1, 1)
      if (tile.rough) { const r = tile.rough.clone(); r.repeat.set(k, k); r.needsUpdate = true; m.roughnessMap = r }
    }
    if (kind === 'satin') { m.roughness = 0.32; m.sheen = 0.9; m.sheenRoughness = 0.25; m.normalScale.multiplyScalar(0.25); m.specularIntensity = 0.8 }
    if (kind === 'velvet') { m.roughness = 0.95; m.sheen = 1; m.sheenRoughness = 0.65; m.normalScale.multiplyScalar(0.4) }
    if (kind === 'sequin') {
      const t = sequinNormal().clone()
      t.repeat.set(scale, scale); t.needsUpdate = true
      m.normalMap = t; m.normalScale.set(1, 1)
      m.metalness = 0.75; m.roughness = 0.22; m.sheen = 0.2; m.clearcoat = 0.4; m.clearcoatRoughness = 0.1
      m.specularIntensity = 1; m.iridescence = 0.15
    }
    if (kind === 'silk') { m.roughness = 0.2; m.sheen = 0.6; m.sheenRoughness = 0.2; m.specularIntensity = 1; m.anisotropy = 0.7; m.anisotropyRotation = Math.PI / 2; m.normalScale.multiplyScalar(0.15) }
    if (kind === 'chiffon') { m.roughness = 0.78; m.sheen = 0.7; m.sheenRoughness = 0.45; m.specularIntensity = 0.45; m.normalScale.set(0.35, 0.35) }
    if (kind === 'crepe') { m.roughness = 0.93; m.sheen = 0.25; m.sheenRoughness = 0.7; m.specularIntensity = 0.35; m.normalScale.set(0.6, 0.6) }
    if (kind === 'taffeta') { m.roughness = 0.34; m.sheen = 0.5; m.sheenRoughness = 0.3; m.specularIntensity = 0.9; m.iridescence = 0.55; m.iridescenceIOR = 1.6; m.iridescenceThicknessRange = [250, 600]; m.normalScale.set(0.3, 0.3) }
    if (kind === 'damask') { m.roughness = 1; m.sheen = 0.5; m.sheenRoughness = 0.35; m.specularIntensity = 0.9; m.normalScale.set(0.45, 0.45) }
    if (kind === 'lame') { m.metalness = 1; m.roughness = 0.32; m.sheen = 0; m.specularIntensity = 1; m.anisotropy = 0.4; m.normalScale.set(0.7, 0.7) }
    if (kind === 'glitter') { m.metalness = 0.85; m.roughness = 0.18; m.sheen = 0.1; m.clearcoat = 0.3; m.clearcoatRoughness = 0.15; m.specularIntensity = 1; m.normalScale.set(1, 1) }
    if (kind === 'beaded') { m.metalness = 0.15; m.roughness = 0.08; m.sheen = 0; m.clearcoat = 1; m.clearcoatRoughness = 0.04; m.specularIntensity = 1; m.iridescence = 0.25; m.normalScale.set(1, 1) }
    if (kind === 'lace') {
      const L = lace(), k = scale * REPEAT.lace, rep = t => { const c = t.clone(); c.repeat.set(k, k); c.needsUpdate = true; return c }
      m.normalMap = rep(L.normal); m.normalScale.set(0.9, 0.9)
      m.roughnessMap = rep(L.rough); m.roughness = 1
      m.sheen = 0.35; m.sheenRoughness = 0.5; m.specularIntensity = 0.6
      laceShader(m, k)
      // (a function in userData would be dropped by a clone: a getter on a frozen key)
      m.userData.traceMap = 'lace'
      st.trace = () => laceBake(m, k)
    }
    if (kind === 'pleated') {
      m.roughness = 0.55; m.sheen = 0.45; m.sheenRoughness = 0.35; m.specularIntensity = 0.7
      if (around === 'u') {
        const t = pleatTile().normal.clone(), k = scale * REPEAT.pleated; t.repeat.set(k, k); t.needsUpdate = true
        m.normalMap = t; m.normalScale.set(1.6, 1.6)
        if (!m.map) { const sh = pleatShadeTile().clone(); sh.repeat.set(k, k); sh.needsUpdate = true; st.mapBase = null; st.map = m.map = sh }
      } else { m.normalScale.multiplyScalar(0.3); pleatShader(m, center) }
    }
    if (kind === 'leather') { m.roughness = 0.5; m.sheen = 0.15; m.sheenRoughness = 0.5; m.clearcoat = 0.35; m.clearcoatRoughness = 0.35; m.specularIntensity = 0.7; m.normalScale.set(0.35, 0.35) }
    m.needsUpdate = true
  }
}
