// Builds the Experiment #032 pianist from MakeHuman's CC0 assets.
//
//   node pianist/build/build-character.mjs [mh-assets-dir]
//
// The asset folder needs (all CC0, see pianist/README.md for where to get them):
//   base/base.obj, base/default.mhskel, base/default_weights.mhw, base/*.target
//   sys/  = makehuman_system_assets_cc0.zip unpacked (skins, eyes, eyebrows,
//           eyelashes)
//
// What it does:
//  1. loads the hm08 base mesh and blends the macro targets of a slim young
//     woman into it (the same blend MakeHuman's sliders would make);
//  2. places the 163-bone default skeleton on the morphed mesh (joint =
//     centroid of its reference vertices) and keeps its skin weights, top 4
//     per vertex;
//  3. fits the eye, eyebrow and eyelash proxies (.mhclo: barycentric on three
//     base vertices plus a scaled offset), which inherit the base weights;
//  4. keeps three helper shells MakeHuman ships inside the base mesh — the
//     scalp ("helper-hair"), tights and skirt — for the hair roots and the
//     dress (they are skinned like the body);
//  5. writes pianist/assets/character.json (+ .bin) and re-encodes the
//     textures (skin 2k JPEG, eye, brow and lash PNGs).
//
// Units in the output: centimetres, y up, the figure facing +z standing on y = 0.

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(process.argv[2] || path.join(os.homedir(), 'test/mh-assets'))
const OUT = path.resolve(HERE, '../assets')
const SYS = path.join(SRC, 'sys')
fs.mkdirSync(OUT, { recursive: true })

// slider recipe (MakeHuman macro targets)
const TARGETS = [
  ['caucasian-female-young.target', 1.0],
  ['universal-female-young-averagemuscle-minweight.target', 0.4],
  ['female-young-averagemuscle-minweight-idealproportions.target', 0.7],
]
const HEIGHT = 165 // cm, top of the head to the soles (uniform scale after the targets)
let SCALE = 10 // MakeHuman units are decimetres; refined to HEIGHT below

// ── OBJ ────────────────────────────────────────────────────────────────────
function readObj(file) {
  const v = [], vt = [], faces = [] // faces: { group, idx:[...], uv:[...] }
  let group = 'default'
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const p = line.trim().split(/\s+/)
    if (p[0] === 'v') v.push([+p[1], +p[2], +p[3]])
    else if (p[0] === 'vt') vt.push([+p[1], +p[2]])
    else if (p[0] === 'g') group = p[1]
    else if (p[0] === 'f') {
      const idx = [], uv = []
      for (const c of p.slice(1)) { const [a, b] = c.split('/'); idx.push(+a - 1); uv.push(b ? +b - 1 : -1) }
      faces.push({ group, idx, uv })
    }
  }
  return { v, vt, faces }
}

const base = readObj(path.join(SRC, 'base/base.obj'))
const NV = base.v.length
const pos = new Float64Array(NV * 3)
base.v.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2] })

// ── Targets ────────────────────────────────────────────────────────────────
for (const [name, w] of TARGETS) {
  const f = path.join(SRC, 'base', name)
  if (!fs.existsSync(f)) { console.warn('missing target', name); continue }
  let n = 0
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line || line[0] === '#') continue
    const p = line.trim().split(/\s+/)
    if (p.length < 4) continue
    const i = +p[0]
    pos[i * 3] += w * +p[1]; pos[i * 3 + 1] += w * +p[2]; pos[i * 3 + 2] += w * +p[3]
    n++
  }
  console.log(`target ${name} ×${w}: ${n} verts`)
}

// uniform scale to HEIGHT, feet on y = 0 (body vertices only)
{
  let lo = Infinity, hi = -Infinity
  for (const f of base.faces) if (f.group === 'body') for (const i of f.idx) { lo = Math.min(lo, pos[i * 3 + 1]); hi = Math.max(hi, pos[i * 3 + 1]) }
  SCALE = HEIGHT / (hi - lo)
  for (let i = 0; i < NV; i++) pos[i * 3 + 1] -= lo
  console.log(`height ${((hi - lo) * 10).toFixed(1)} cm → ${HEIGHT} cm (×${(SCALE / 10).toFixed(3)})`)
}

// ── Skeleton ───────────────────────────────────────────────────────────────
const skel = JSON.parse(fs.readFileSync(path.join(SRC, 'base/default.mhskel'), 'utf8'))
const joint = {}
for (const [name, list] of Object.entries(skel.joints)) {
  const c = [0, 0, 0]
  for (const i of list) { c[0] += pos[i * 3]; c[1] += pos[i * 3 + 1]; c[2] += pos[i * 3 + 2] }
  joint[name] = c.map(x => x / list.length)
}
// order bones parents-first
const names = Object.keys(skel.bones)
const order = []
const seen = new Set()
const visit = n => { if (seen.has(n)) return; const p = skel.bones[n].parent; if (p) visit(p); seen.add(n); order.push(n) }
names.forEach(visit)
const boneIndex = Object.fromEntries(order.map((n, i) => [n, i]))
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l) }
const bones = order.map(n => {
  const b = skel.bones[n]
  const head = joint[b.head], tail = joint[b.tail]
  const y = norm(sub(tail, head))
  // roll from the bone's rotation plane (three joints); x = plane normal ⟂ y
  let x = [1, 0, 0]
  const pl = skel.planes[b.rotation_plane]
  if (pl) {
    const [p0, p1, p2] = pl.map(j => joint[j])
    const nrm = norm(cross(sub(p1, p0), sub(p2, p1)))
    const t = sub(nrm, y.map(c => c * dot(nrm, y)))
    if (Math.hypot(...t) > 1e-6) x = norm(t)
  }
  if (Math.abs(dot(x, y)) > 0.99) x = norm(cross(y, [0, 0, 1]))
  x = norm(sub(x, y.map(c => c * dot(x, y))))
  const z = cross(x, y)
  const S = v => v.map(c => +(c * SCALE).toFixed(4))
  return { name: n, parent: b.parent ? boneIndex[b.parent] : -1, head: S(head), tail: S(tail), x: x.map(c => +c.toFixed(5)), y: y.map(c => +c.toFixed(5)), z: z.map(c => +c.toFixed(5)) }
})
console.log(`skeleton: ${bones.length} bones`)

// weights: per vertex top-4
const mhw = JSON.parse(fs.readFileSync(path.join(SRC, 'base/default_weights.mhw'), 'utf8')).weights
const vw = Array.from({ length: NV }, () => [])
for (const [bn, list] of Object.entries(mhw)) {
  const bi = boneIndex[bn]
  if (bi === undefined) continue
  for (const [vi, w] of list) vw[vi].push([bi, w])
}
function top4(list) {
  const l = list.slice().sort((a, b) => b[1] - a[1]).slice(0, 4)
  const s = l.reduce((a, b) => a + b[1], 0) || 1
  while (l.length < 4) l.push([0, 0])
  return l.map(([b, w]) => [b, w / s])
}
const baseSkin = vw.map(top4)
const zeroWeight = baseSkin.filter(l => l[0][1] === 0).length
if (zeroWeight) console.log(`${zeroWeight} base verts without weights (helpers / joints)`)

// ── Parts ──────────────────────────────────────────────────────────────────
// A part: corner-split vertices (position + uv), skin, triangles.
function makePart(name, P, UV, skin, faces) {
  const map = new Map(), vp = [], vu = [], si = [], sw = [], src = [], tri = []
  for (const f of faces) {
    const ids = f.idx.map((vi, k) => {
      const ui = f.uv[k]
      const key = vi * 1e6 + (ui + 1)
      let id = map.get(key)
      if (id === undefined) {
        id = vp.length / 3
        map.set(key, id)
        vp.push(P[vi * 3] * SCALE, P[vi * 3 + 1] * SCALE, P[vi * 3 + 2] * SCALE)
        const uv = ui >= 0 && UV ? UV[ui] : [0, 0]
        vu.push(uv[0], uv[1])
        for (const [b, w] of skin[vi]) { si.push(b); sw.push(w) }
        src.push(vi)
      }
      return id
    })
    for (let k = 1; k + 1 < ids.length; k++) tri.push(ids[0], ids[k], ids[k + 1])
  }
  console.log(`part ${name}: ${vp.length / 3} verts, ${tri.length / 3} tris`)
  return { name, position: vp, uv: vu, skinIndex: si, skinWeight: sw, index: tri, source: src }
}

const parts = []
const byGroup = g => base.faces.filter(f => f.group === g)
parts.push(makePart('body', pos, base.vt, baseSkin, byGroup('body')))
for (const g of ['helper-hair', 'helper-tights', 'helper-skirt'])
  parts.push(makePart(g.replace('helper-', 'helper_'), pos, base.vt, baseSkin, byGroup(g)))

// ── Proxies ────────────────────────────────────────────────────────────────
function fitProxy(name, mhcloFile) {
  const dir = path.dirname(mhcloFile)
  const lines = fs.readFileSync(mhcloFile, 'utf8').split(/\r?\n/)
  let objFile, scale = {}, refs = [], inVerts = false, inDelete = false
  const deleted = []
  for (const line of lines) {
    if (!line || line[0] === '#') continue
    const p = line.trim().split(/\s+/)
    // (vertex lines may follow other keywords after 'verts', e.g. 'material')
    if (/^[a-z_]/i.test(p[0])) inDelete = false
    if (inVerts && /^[a-z_]/i.test(p[0]) && p[0] === 'delete_verts') inVerts = false
    if (p[0] === 'delete_verts') { inDelete = true; continue }
    if (inDelete) {
      // "a - b" ranges and single indices: base vertices this garment hides
      for (let i = 0; i < p.length; i++) {
        if (p[i + 1] === '-') { for (let v = +p[i]; v <= +p[i + 2]; v++) deleted.push(v); i += 2 } else deleted.push(+p[i])
      }
      continue
    }
    if (inVerts && !/^[a-z_]/i.test(p[0])) {
      {
        if (p.length === 1) refs.push({ v: [+p[0], +p[0], +p[0]], w: [1, 0, 0], d: [0, 0, 0] })
        else if (p.length >= 9) refs.push({ v: [+p[0], +p[1], +p[2]], w: [+p[3], +p[4], +p[5]], d: [+p[6], +p[7], +p[8]] })
        continue
      }
    }
    if (p[0] === 'obj_file') objFile = p[1]
    else if (/^[xyz]_scale$/.test(p[0])) scale[p[0][0]] = [+p[1], +p[2], +p[3]]
    else if (p[0] === 'verts') inVerts = true
  }
  const s = ['x', 'y', 'z'].map((ax, k) => {
    const sc = scale[ax]
    if (!sc) return 1
    return Math.abs(pos[sc[0] * 3 + k] - pos[sc[1] * 3 + k]) / sc[2]
  })
  const obj = readObj(path.join(dir, objFile))
  const P = new Float64Array(refs.length * 3), skin = []
  let unweighted = 0
  refs.forEach((r, i) => {
    for (let k = 0; k < 3; k++) {
      P[i * 3 + k] = r.w[0] * pos[r.v[0] * 3 + k] + r.w[1] * pos[r.v[1] * 3 + k] + r.w[2] * pos[r.v[2] * 3 + k] + r.d[k] * s[k]
    }
    const acc = new Map()
    for (let j = 0; j < 3; j++) for (const [b, w] of vw[r.v[j]]) acc.set(b, (acc.get(b) || 0) + w * r.w[j])
    let list = [...acc.entries()]
    if (!list.length) {
      // helper vertices (the eye helpers) carry no weights in the .mhw:
      // the eyes go to their eye bone, anything else to the nearest weighted vertex
      const x = P[i * 3]
      if (name === 'eyes') list = [[boneIndex[x > 0 ? 'eye.L' : 'eye.R'], 1]]
      else {
        let best = -1, bd = Infinity
        for (let v = 0; v < NV; v++) {
          if (!vw[v].length) continue
          const d = (pos[v * 3] - P[i * 3]) ** 2 + (pos[v * 3 + 1] - P[i * 3 + 1]) ** 2 + (pos[v * 3 + 2] - P[i * 3 + 2]) ** 2
          if (d < bd) { bd = d; best = v }
        }
        list = vw[best]
      }
      unweighted++
    }
    skin.push(top4(list))
  })
  if (unweighted) console.log(`${name}: ${unweighted} verts without weights, assigned`)
  if (obj.v.length !== refs.length) console.warn(`${name}: obj ${obj.v.length} verts vs ${refs.length} refs`)
  const part = makePart(name, P, obj.vt, skin, obj.faces)
  part.deleteVerts = deleted
  return part
}
parts.push(fitProxy('eyes', path.join(SYS, 'eyes/high-poly/high-poly.mhclo')))
parts.push(fitProxy('eyebrows', path.join(SYS, 'eyebrows/eyebrow001/eyebrow001.mhclo')))
parts.push(fitProxy('eyelashes', path.join(SYS, 'eyelashes/eyelashes01/eyelashes01.mhclo')))
// mesh hair styles (alpha cards, skinned: no simulation needed)
export const HAIR_MESHES = ['bob01', 'bob02', 'ponytail01', 'braid01', 'long01']
for (const h of HAIR_MESHES) parts.push(fitProxy('hair_' + h, path.join(SYS, `hair/${h}/${h}.mhclo`)))

// community assets (MakeHuman community repository, CC0 / CC-BY): folders of
// <SRC>/community/<nid>/ with the .mhclo, .obj, .mhmat, textures and the
// catalogue entry (meta.json), fetched by pianist/build/fetch-community.mjs
const COMMUNITY_DIR = path.join(SRC, 'community')
const KINDS = { hair: /hair|bob|bun|updo|braid/i, top: /top|sweater|shirt/i }
const community = []
if (fs.existsSync(COMMUNITY_DIR)) for (const nid of fs.readdirSync(COMMUNITY_DIR).sort((a, b) => a - b)) {
  const dir = path.join(COMMUNITY_DIR, nid)
  const mhclo = fs.readdirSync(dir).find(f => f.endsWith('.mhclo'))
  if (!mhclo || !fs.existsSync(path.join(dir, 'meta.json'))) continue
  const info = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
  const key = 'c' + nid
  try { parts.push(fitProxy(key, path.join(dir, mhclo))) } catch (e) { console.warn(`community ${nid}: ${e.message}`); continue }
  // material: the .mhmat's textures if present, else the catalogue's
  const mat = {}
  const mhmat = fs.readdirSync(dir).find(f => f.endsWith('.mhmat'))
  if (mhmat) for (const line of fs.readFileSync(path.join(dir, mhmat), 'utf8').split(/\r?\n/)) {
    const m = line.trim().match(/^(diffuseTexture|normalmapTexture)\s+(.+)$/)
    if (m) { const f = path.basename(m[2].trim()); if (fs.existsSync(path.join(dir, f))) mat[m[1]] = f }
  }
  if (!mat.diffuseTexture && info.files?.diffuse) { const f = path.basename(info.files.diffuse); if (fs.existsSync(path.join(dir, f))) mat.diffuseTexture = f }
  if (!mat.diffuseTexture && info.files?.alpha) { const f = path.basename(info.files.alpha); if (fs.existsSync(path.join(dir, f))) mat.diffuseTexture = f }
  const kind = info.category === 'Hair' || KINDS.hair.test(info.title) ? 'hair' : KINDS.top.test(info.title) ? 'top' : 'dress'
  community.push({ key, nid: +nid, kind, title: info.title.trim(), author: info.username, license: info.license, url: `http://www.makehumancommunity.org/node/${nid}`, dir, mat })
}

// ── Write ──────────────────────────────────────────────────────────────────
const chunks = []
let offset = 0
function put(typed) {
  const pad = (4 - (offset % 4)) % 4
  if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad }
  const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength)
  chunks.push(b)
  const r = { offset, length: typed.length }
  offset += b.length
  return r
}
const meta = {
  generator: 'pianist/build/build-character.mjs',
  license: 'Mesh, skeleton, weights, targets and textures: MakeHuman, CC0 1.0',
  units: 'cm, y up, facing +z, feet on y = 0',
  targets: TARGETS,
  bones,
  joints: Object.fromEntries(Object.entries(joint).map(([k, v]) => [k, v.map(c => +(c * SCALE).toFixed(3))])),
  parts: {},
  community: [],
}
for (const p of parts) {
  const nv = p.position.length / 3
  meta.parts[p.name] = {
    count: nv,
    position: put(new Float32Array(p.position)),
    uv: put(new Float32Array(p.uv)),
    skinIndex: put(new Uint16Array(p.skinIndex)),
    skinWeight: put(new Float32Array(p.skinWeight)),
    index: put(nv > 65535 ? new Uint32Array(p.index) : new Uint16Array(p.index)),
    indexType: nv > 65535 ? 'u32' : 'u16',
    source: put(new Uint16Array(p.source)), // base-mesh vertex each came from (body / helpers)
    ...(p.deleteVerts?.length ? { deleteVerts: put(new Uint16Array(p.deleteVerts)) } : {}),
  }
}
fs.writeFileSync(path.join(OUT, 'character.bin'), Buffer.concat(chunks))
fs.writeFileSync(path.join(OUT, 'character.json'), JSON.stringify(meta))
console.log(`wrote character.bin (${(offset / 1e6).toFixed(2)} MB)`)

// ── Textures ───────────────────────────────────────────────────────────────
const ff = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args])
ff(['-i', path.join(SYS, 'skins/young_caucasian_female/young_lightskinned_female_diffuse.png'), '-q:v', '3', path.join(OUT, 'skin.jpg')])
// (the eye texture keeps its alpha: the cornea shell is mapped to a transparent corner)
ff(['-i', path.join(SYS, 'eyes/materials/brownlight_eye.png'), '-vf', 'scale=512:512', path.join(OUT, 'eye.png')])
fs.copyFileSync(path.join(SYS, 'eyebrows/eyebrow001/eyebrow001.png'), path.join(OUT, 'eyebrow.png'))
fs.copyFileSync(path.join(SYS, 'eyelashes/eyelashes01/eyelashes01.png'), path.join(OUT, 'eyelashes.png'))
// hair cards: luminance + alpha only (recoloured in the shader), 1024²
for (const h of HAIR_MESHES)
  ff(['-i', path.join(SYS, `hair/${h}/${h}_diffuse.png`), '-vf', 'scale=1024:1024,format=ya8', path.join(OUT, `hair_${h}.png`)])
// community textures: diffuse ≤1024² PNG (alpha kept), normal map ≤1024² JPEG
fs.mkdirSync(path.join(OUT, 'community'), { recursive: true })
for (const c of community) {
  const e = { key: c.key, nid: c.nid, kind: c.kind, title: c.title, author: c.author, license: c.license, url: c.url }
  if (c.mat.diffuseTexture) { ff(['-i', path.join(c.dir, c.mat.diffuseTexture), '-vf', "scale='min(1024,iw)':-1", path.join(OUT, 'community', c.key + '.png')]); e.map = `community/${c.key}.png` }
  if (c.mat.normalmapTexture) { ff(['-i', path.join(c.dir, c.mat.normalmapTexture), '-vf', "scale='min(1024,iw)':-1", '-q:v', '3', path.join(OUT, 'community', c.key + '_n.jpg')]); e.normalMap = `community/${c.key}_n.jpg` }
  meta.community.push(e)
}
fs.writeFileSync(path.join(OUT, 'character.json'), JSON.stringify(meta))
// credits for the CC-BY assets
fs.writeFileSync(path.join(OUT, 'community', 'CREDITS.md'), '# Community assets\n\nFrom the MakeHuman community asset repository, fitted by pianist/build/build-character.mjs.\n\n' +
  meta.community.map(e => `- ${e.title} by ${e.author} (${e.license}) — ${e.url}`).join('\n') + '\n')
console.log('textures written')
