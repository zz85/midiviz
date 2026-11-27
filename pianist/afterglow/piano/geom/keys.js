// Keyboard (research/piano.md section 5): 88 keys built from 10 shape classes and drawn with InstancedMesh.
// White key = 2 mm warm-white keytop (head + tail outline) + white front piece over a light-wood body whose sides
// show when a neighbour is pressed. Black key = lofted, tapered ebony sharp (sloped front, filleted top) on a
// wooden lever. Each instance rotates about the common balance axis (x-parallel line at y 0.686, z 0.290).
import * as THREE from 'three';
import { roundedSlab, roundedOutline, finish, MeshBuilder, mergeGeos } from './util.js';

const KEY_BACK_Z = 0.600;      // key levers run back under the action (hidden by the plate / fallboard)

function slabY(outlineXZ, y0, h, rTop, rBot, seg = 3) {
  const mb = roundedSlab(outlineXZ, h, { rTop, rBot, seg });
  return finish(mb, new THREE.Matrix4().makeTranslation(0, y0, 0));
}

function boxGeo(x0, x1, y0, y1, z0, z1, r) {
  const out = roundedOutline([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [r, r, r, r], 3);
  return slabY(out, y0, y1 - y0, r, r, 3);
}

/** Lofted black sharp, local x relative to the key's base left edge. */
function blackSharpGeo(K) {
  const b = K.black; const y0 = K.topY - 0.002; // sharps sit on the lever top (white keytop level - 2 mm)
  const y1 = K.topY + b.height; const h = y1 - y0;
  const rf = b.topFillet; const rc = 0.0016; // vertical corner radius
  const nRing = 72;
  const ys = [];
  const nb = 6, nt = 8;
  for (let k = 0; k <= nb; k++) ys.push(y0 + (h - rf) * k / nb);
  for (let k = 1; k <= nt; k++) ys.push(y1 - rf + rf * Math.sin((k / nt) * Math.PI / 2));
  const rings = [];
  for (const y of ys) {
    const t = (y - y0) / h;
    // top-edge fillet inset
    const dy = y - (y1 - rf);
    const inset = dy > 0 ? rf - Math.sqrt(Math.max(0, rf * rf - dy * dy)) : 0;
    const hw = (b.baseW + (b.topW - b.baseW) * t) / 2 - inset;
    const zf = b.frontZ + b.frontSlope * t + inset, zb = b.frontZ + b.baseLen - b.rearSlope * t - inset;
    const cx = b.baseW / 2, cz = (zf + zb) / 2, hz = (zb - zf) / 2;
    const r = Math.min(rc, hw - 1e-5, hz - 1e-5);
    const ring = [];
    // rounded rectangle, CCW in (x, z), uniform-ish sampling
    const per = 4 * (hw - r) + 4 * (hz - r) + 2 * Math.PI * r;
    for (let j = 0; j < nRing; j++) {
      let s = (j / nRing) * per; let x = 0, z = 0;
      const seglist = [
        ['e', 2 * (hz - r), (f) => [hw, -hz + r + f * 2 * (hz - r)]],
        ['a', Math.PI / 2 * r, (f) => { const a = f * Math.PI / 2; return [hw - r + Math.cos(a) * r, hz - r + Math.sin(a) * r]; }],
        ['e', 2 * (hw - r), (f) => [hw - r - f * 2 * (hw - r), hz]],
        ['a', Math.PI / 2 * r, (f) => { const a = Math.PI / 2 + f * Math.PI / 2; return [-hw + r + Math.cos(a) * r, hz - r + Math.sin(a) * r]; }],
        ['e', 2 * (hz - r), (f) => [-hw, hz - r - f * 2 * (hz - r)]],
        ['a', Math.PI / 2 * r, (f) => { const a = Math.PI + f * Math.PI / 2; return [-hw + r + Math.cos(a) * r, -hz + r + Math.sin(a) * r]; }],
        ['e', 2 * (hw - r), (f) => [-hw + r + f * 2 * (hw - r), -hz]],
        ['a', Math.PI / 2 * r, (f) => { const a = 1.5 * Math.PI + f * Math.PI / 2; return [hw - r + Math.cos(a) * r, -hz + r + Math.sin(a) * r]; }],
      ];
      for (const [, Ls, fn] of seglist) { if (s <= Ls + 1e-12) { [x, z] = fn(Ls > 0 ? s / Ls : 0); break; } s -= Ls; }
      ring.push(new THREE.Vector3(cx + x, y, cz + z));
    }
    rings.push(ring);
  }
  // loft (indexed, smooth) + flat top cap + bottom cap
  const mb = new MeshBuilder();
  const ids = [];
  for (const ring of rings) for (const p of ring) ids.push(mb.vert(p.x, p.y, p.z, 0, 0, 0));
  mb.grid(ids, rings.length, nRing, true);
  const g = mb.build({ orient: false });
  g.computeVertexNormals();
  // orientation: make normals point away from the key axis
  const pos = g.attributes.position, nrm = g.attributes.normal;
  const cxx = b.baseW / 2, czz = b.frontZ + b.baseLen / 2;
  let dot = 0; for (let i = 0; i < pos.count; i += 7) dot += (pos.getX(i) - cxx) * nrm.getX(i) + (pos.getZ(i) - czz) * nrm.getZ(i);
  if (dot < 0) { for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i)); }
  const capMB = new MeshBuilder();
  capMB.append(g);
  for (const [ring, up] of [[rings[rings.length - 1], 1], [rings[0], -1]]) {
    let cx2 = 0, cz2 = 0; ring.forEach((p) => { cx2 += p.x; cz2 += p.z; }); cx2 /= ring.length; cz2 /= ring.length;
    const c = capMB.vert(cx2, ring[0].y, cz2, 0, up, 0);
    const base = capMB.count; ring.forEach((p) => capMB.vert(p.x, p.y, p.z, 0, up, 0));
    for (let j = 0; j < nRing; j++) capMB.tri(c, base + j, base + ((j + 1) % nRing));
  }
  return capMB.build();
}

export function buildKeys(L, M) {
  const K = L.keyboard;
  const keys = L.keys;
  const group = new THREE.Group(); group.name = 'keys';
  const topY = K.topY, kt = K.keytopThk, yBot = topY - K.frontHeight; // 0.6915
  const yWoodTop = topY - kt;
  // ---------------------------------------------------------------- shape classes
  const classOf = (k) => (k.color === 'black' ? 'black' : (k.n === 1 ? 'A0' : (k.n === 88 ? 'C8' : k.name.replace(/\d+$/, ''))));
  const classes = new Map();
  for (const k of keys) { const c = classOf(k); if (!classes.has(c)) classes.set(c, []); classes.get(c).push(k); }
  const meshes = []; // { mesh, keys: [n...], originX: [...] }
  // neighbours for the side-face occlusion: [headLeft, headRight, tailLeft, tailRight] (-1 = cheek block)
  const isB = keys.map((k) => k.color === 'black');
  const prevWhite = (i) => { for (let j = i - 1; j >= 0; j--) if (!isB[j]) return j; return -1; };
  const nextWhite = (i) => { for (let j = i + 1; j < 88; j++) if (!isB[j]) return j; return -1; };
  const neighbours = (i) => {
    if (isB[i]) return [i - 1, i + 1, i - 1, i + 1];
    const hl = prevWhite(i), hr = nextWhite(i);
    return [hl, hr, i > 0 ? i - 1 : -1, i < 87 ? i + 1 : -1];
  };
  const addInst = (geo0, mat, members, originX, name) => {
    const geo = geo0.clone();
    geo.setAttribute('agKN', new THREE.InstancedBufferAttribute(Float32Array.from(members.flatMap((k) => neighbours(k.n - 1))), 4));
    geo.setAttribute('agKSelf', new THREE.InstancedBufferAttribute(Float32Array.from(members.map((k) => k.n - 1)), 1));
    const im = new THREE.InstancedMesh(geo, mat, members.length);
    im.name = name; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(im); meshes.push({ mesh: im, keys: members.map((k) => k.n), originX });
    return im;
  };
  for (const [cname, members] of classes) {
    const ref = members[0];
    if (cname === 'black') {
      const x0 = ref.x_center - K.black.baseW / 2;
      const sharp = blackSharpGeo(K);
      // lever under the sharp (wood), slightly narrower than the sharp base
      const lw = 0.0108, lx0 = (K.black.baseW - lw) / 2;
      const lever = boxGeo(lx0, lx0 + lw, yBot, yWoodTop + 0.0, K.black.frontZ, KEY_BACK_Z, 0.0004);
      const originX = members.map((k) => k.x_center - K.black.baseW / 2);
      addInst(sharp, M.keyBlack, members, originX, 'keySharp');
      addInst(lever, M.keyWood, members, originX, 'keyLeverBlack');
      void x0;
      continue;
    }
    const x0 = ref.x_range[0];
    const poly = ref.top_xz.map(([x, z]) => [x - x0, z]);
    const zf = K.frontZ, zb = zf + K.visibleLen;
    // keytop (head + tail outline), 2 mm, filleted top edge
    const topOutline = roundedOutline(poly, poly.map(() => 0.0006), 3);
    const keytop = slabY(topOutline, yWoodTop, kt, K.topFillet, 0.00015, 3);
    // white front piece (covers the wood end grain over the visible front height)
    const g = K.gap / 2;
    const fx0 = ref.x_range[0] + g - x0, fx1 = ref.x_range[1] - g - x0;
    const front = boxGeo(fx0, fx1, yBot, yWoodTop + 0.0002, zf, zf + 0.0016, 0.0003);
    // wood body: same outline, tail extended back under the fallboard to the action
    const woodPoly = poly.map(([x, z]) => [x, Math.abs(z - zb) < 1e-6 ? KEY_BACK_Z : (Math.abs(z - zf) < 1e-6 ? zf + 0.0016 : z)]);
    const woodOutline = roundedOutline(woodPoly, woodPoly.map(() => 0.0004), 3);
    const wood = slabY(woodOutline, yBot, yWoodTop - yBot, 0.0001, 0.0004, 2);
    const white = mergeGeos([keytop, front]);
    const originX = members.map((k) => k.x_range[0]);
    addInst(white, M.keyWhite, members, originX, 'keyTop_' + cname);
    addInst(wood, M.keyWood, members, originX, 'keyWood_' + cname);
  }

  // ---------------------------------------------------------------- animation
  const angles = new Float32Array(88);
  const pivot = K.pivot;
  const m = new THREE.Matrix4(), r = new THREE.Matrix4(), t1 = new THREE.Matrix4(), t2 = new THREE.Matrix4();
  let shiftX = 0;
  const aoAngles = M.shared ? M.shared.keys.agKeyAng.value : null;
  function apply() {
    if (aoAngles) aoAngles.set(angles);
    for (const e of meshes) {
      for (let i = 0; i < e.keys.length; i++) {
        const a = angles[e.keys[i] - 1];
        // T(origin) * T(pivot) * Rx(-a) * T(-pivot): pressing moves the key front down
        t1.makeTranslation(e.originX[i] + shiftX, pivot.y, pivot.z);
        r.makeRotationX(-a);
        t2.makeTranslation(0, -pivot.y, -pivot.z);
        m.multiplyMatrices(t1, r).multiply(t2);
        e.mesh.setMatrixAt(i, m);
      }
      e.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  apply();
  return {
    group,
    angles,
    setAngles(arr) { angles.set(arr); apply(); },
    setShift(dx) { shiftX = dx; apply(); },
    apply,
  };
}
