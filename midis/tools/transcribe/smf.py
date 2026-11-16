"""A small Standard MIDI File reader: read(path) -> (ppq, [track: [(tick, pitch, ticks, velocity, program)]])."""
import struct

def read(path):
    d = open(path, 'rb').read()
    if d[:4] != b'MThd': raise ValueError(f'{path}: not a MIDI file')
    _, ntr, ppq = struct.unpack('>HHH', d[8:14]); i = 8 + struct.unpack('>I', d[4:8])[0]
    tracks = []
    while i < len(d) and len(tracks) < ntr:
        n = struct.unpack('>I', d[i + 4:i + 8])[0]; tracks.append(_track(d[i + 8:i + 8 + n])); i += 8 + n
    return ppq, tracks

def _vlq(b, i):
    v = 0
    while True:
        c = b[i]; i += 1; v = (v << 7) | (c & 0x7f)
        if c < 0x80: return v, i

def _track(b):
    i = t = 0; run = 0; on = {}; out = []; prog = [0] * 16
    while i < len(b):
        dt, i = _vlq(b, i); t += dt; st = b[i]
        if st == 0xff: n, j = _vlq(b, i + 2); i = j + n; continue
        if st in (0xf0, 0xf7): n, j = _vlq(b, i + 1); i = j + n; continue
        if st & 0x80: run = st; i += 1
        k, ch = run & 0xf0, run & 0x0f
        if k in (0xc0, 0xd0): prog[ch] = b[i] if k == 0xc0 else prog[ch]; i += 1; continue
        a, v = b[i], b[i + 1]; i += 2
        if k == 0x90 and v: on.setdefault((ch, a), []).append((t, v, prog[ch]))
        elif k in (0x80, 0x90) and on.get((ch, a)):
            t0, v0, p0 = on[(ch, a)].pop(0); out.append((t0, a, t - t0, v0, p0))
    return sorted(out)
