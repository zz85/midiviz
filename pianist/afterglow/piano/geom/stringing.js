// String paths for every unison string (pure JS, piano frame). Shared by the plate/pin builder and the string tubes.
// Rules (research/piano.md 7.3-7.6, 8): trichord pins in rows A/B/C (z 0 / -0.018 / -0.036 along the string, x -4.5/0/+4.5 mm),
// bichords and singles alternate rows A/B; unison spacing +-3.9 mm (trichord), +-2.5 mm (wound bichord); 2 bridge pins per
// string 7 mm apart with +-1.5 mm side bearing; plain wire loops around one hitch pin per 2 strings, wound strings 1 per pin.

export function computeStrings(L) {
  const H = L.heights;
  const out = [];
  for (const nt of L.notes) {
    const n = nt.n;
    const d = nt.dir_xz; // unit (x, z)
    const perp = [d[1], -d[0]];
    const k = nt.strings;
    const sp = k === 3 ? 0.0039 : (k === 2 ? 0.0025 : 0);
    const bass = n <= 20;
    const yFront = bass ? H.bassAgraffe : H.tenorStrings;
    const yBridge = bass ? H.bassBridgeTop + 0.0012 : H.longBridgeTop + 0.0008;
    const yHitch = H.hitch;
    const wireR = (nt.wound ? nt.core_d_mm : nt.wire_d_mm) / 2000;
    for (let i = 0; i < k; i++) {
      const o = (i - (k - 1) / 2) * sp;
      const off = (p, s = 0) => [p[0] + perp[0] * o + d[0] * s, p[1] + perp[1] * o + d[1] * s];
      // tuning pin
      let row, dx;
      if (k === 3) { row = i; dx = [-0.0045, 0, 0.0045][i]; } else if (k === 2) { row = i; dx = i === 0 ? -0.0025 : 0.0025; } else { row = n % 2; dx = 0; }
      const pinA = nt.pin_xz;
      const pin = [pinA[0] + dx - d[0] * 0.018 * row, pinA[1] - d[1] * 0.018 * row];
      // the coil leaves the pin tangentially on the string side; aim the string at the pin centre + radius
      const front = off(nt.front_xz);
      const bridgeF = off(nt.bridge_xz, -0.0035), bridgeB = off(nt.bridge_xz, 0.0035);
      const side = (i % 2 === 0 ? 1 : -1) * 0.0010;
      const hitch = off(nt.hitch_xz);
      out.push({
        n, i, k, bass, wound: nt.wound, plainD: nt.wire_d_mm / 1000, woundD: nt.wound ? nt.wire_d_mm / 1000 : 0, coreD: (nt.wound ? nt.core_d_mm : nt.wire_d_mm) / 1000,
        wireR, dir: d, perp, offset: o, term: nt.front_termination,
        pin, pinY: H.plate + 0.012, front, yFront, bridgeF, bridgeB, side, yBridge, hitch, yHitch,
        strikeXZ: off(nt.strike_xz), damper: nt.damper,
      });
    }
  }
  // hitch pins: wound strings one each; plain strings paired consecutively (s, s+1) -> one pin between them
  const hitchPins = [];
  const plain = out.filter((s) => !s.wound);
  for (const s of out.filter((q) => q.wound)) {
    s.hitchPin = hitchPins.length;
    hitchPins.push({ x: s.hitch[0] + s.dir[0] * 0.004, z: s.hitch[1] + s.dir[1] * 0.004, dir: s.dir, pair: [s] });
  }
  for (let j = 0; j < plain.length; j += 2) {
    const a = plain[j], b = plain[j + 1] || null;
    const cx = b ? (a.hitch[0] + b.hitch[0]) / 2 : a.hitch[0], cz = b ? (a.hitch[1] + b.hitch[1]) / 2 : a.hitch[1];
    const dir = a.dir;
    const pin = { x: cx + dir[0] * 0.004, z: cz + dir[1] * 0.004, dir, pair: b ? [a, b] : [a] };
    a.hitchPin = hitchPins.length; if (b) b.hitchPin = hitchPins.length;
    hitchPins.push(pin);
  }
  return { strings: out, hitchPins };
}
