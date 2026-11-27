// Strings: plain steel (tenor/treble trichords) and copper-wound bass strings (steel core + copper winding with a
// helical-groove normal map, 25 mm of bare core at both ends). Each string runs pin coil -> agraffe/capo -> bridge pins
// (side bearing) -> hitch pin; plain wire loops around one hitch pin per 2 strings.
import * as THREE from 'three';
import { MeshBuilder, tube } from './util.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildStrings(L, M, SS) {
  const group = new THREE.Group(); group.name = 'strings';
  const plain = new MeshBuilder(), core = new MeshBuilder(), copper = new MeshBuilder();
  const H = L.heights;
  const pinR = 0.0035, hitchR = 0.0030;
  for (const s of SS.strings) {
    const d = s.dir;
    // leave the coil on the side facing the agraffe, at the coil height
    const p0 = V3(s.pin[0] + d[0] * (pinR + s.wireR), s.pinY + 0.0015, s.pin[1] + d[1] * (pinR + s.wireR));
    const p1 = V3(s.front[0], s.yFront, s.front[1]);
    const p2 = V3(s.bridgeF[0] + s.perp[0] * s.side, s.yBridge + s.wireR, s.bridgeF[1] + s.perp[1] * s.side);
    const p3 = V3(s.bridgeB[0] - s.perp[0] * s.side, s.yBridge + s.wireR, s.bridgeB[1] - s.perp[1] * s.side);
    const hp = SS.hitchPins[s.hitchPin];
    // end at the hitch pin's front face, at the pin base height
    const lat = (s.hitch[0] - hp.x) * s.perp[0] + (s.hitch[1] - hp.z) * s.perp[1];
    const p4 = V3(hp.x + s.perp[0] * lat - d[0] * (hitchR + s.wireR) * 0.6, H.hitch + s.wireR, hp.z + s.perp[1] * lat - d[1] * (hitchR + s.wireR) * 0.6);
    const pts = [p0, p1, p2, p3, p4];
    const r = s.wound ? s.coreD / 2 : s.wireR;
    tube(pts, r, { radial: s.wound ? 10 : 8, caps: 'round', mb: s.wound ? core : plain, uvScale: 1 });
    if (s.wound) {
      // copper winding over the speaking length minus 25 mm bare core at each end
      const L01 = p2.distanceTo(p1);
      const dirv = p2.clone().sub(p1).normalize();
      const a = p1.clone().addScaledVector(dirv, 0.025), b = p2.clone().addScaledVector(dirv, -0.025);
      const segs = Math.max(2, Math.ceil(L01 / 0.08));
      const wpts = []; for (let i = 0; i <= segs; i++) wpts.push(a.clone().lerp(b, i / segs));
      const pitch = THREE.MathUtils.clamp((s.woundD - s.coreD) / 4, 0.00045, 0.0012);
      // short tapered start/end (inner layer visible) via radius function
      const R = s.woundD / 2, Rc = s.coreD / 2;
      tube(wpts, (i, n) => (i === 0 || i === n - 1 ? Rc + (R - Rc) * 0.82 : R), { radial: 16, caps: 'round', mb: copper, uvScale: 1 / pitch, helix: 1 });
    }
  }
  // hitch loops for plain-wire pairs: semicircle around the back of the pin
  for (const hp of SS.hitchPins) {
    if (hp.pair.length !== 2 || hp.pair[0].wound) continue;
    const [a, b] = hp.pair; const d = hp.dir; const perp = a.perp;
    const la = (a.hitch[0] - hp.x) * perp[0] + (a.hitch[1] - hp.z) * perp[1];
    const lb = (b.hitch[0] - hp.x) * perp[0] + (b.hitch[1] - hp.z) * perp[1];
    const R = hitchR + a.wireR;
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n; const ang = Math.PI * t; // from side a, around the back (+d), to side b
      const sa = Math.sign(la || -1), sb = Math.sign(lb || 1);
      const u = (Math.cos(ang) * (sa > 0 ? 1 : -1)) * Math.max(R, Math.abs(t < 0.5 ? la : lb));
      const v = Math.sin(ang) * R - (hitchR + a.wireR) * 0.6 * (1 - Math.sin(ang));
      void sb;
      pts.push(V3(hp.x + perp[0] * u + d[0] * v, H.hitch + a.wireR, hp.z + perp[1] * u + d[1] * v));
    }
    tube(pts, a.wireR, { radial: 6, caps: 'round', mb: plain });
  }
  const mk = (mb, mat, name) => { const m = new THREE.Mesh(mb.build(), mat); m.name = name; m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
  mk(plain, M.steelString, 'stringsPlain');
  mk(core, M.steelString, 'stringsCore');
  mk(copper, M.copperString, 'stringsCopper');
  return { group };
}
