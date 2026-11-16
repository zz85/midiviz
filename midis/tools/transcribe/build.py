"""Build a movement's MIDI: python3 build.py <work> <movement> [out.mid]

Each bar's notes are the OMR's reading of the score (omr.json), staff by staff, except where
fixes-<movement>.txt gives the bar's staff in full: those are read from the scan. Ties join notes
of one pitch, across barlines too; a grace note takes a 32nd before its beat. Writes a type-1 MIDI:
track 0 tempo, meter, key and the score's tempo words, track 1 the violin (pizzicato where the
score says so), tracks 2 and 3 the piano's upper and lower staff. Prints the checks it makes."""
import json, os, re, struct, sys
from fractions import Fraction as F
import work as W

PPQ = 480

def parse_fixes(path):
    """'<bar> <VN|RH|LH>  <onset>:<pitch>[,<pitch>...]:<duration>[~] ...  # note' (a # after a space starts a note) -> {(bar, staff): [(on, midi, dur, tie, grace)]}.
    Onset and duration in quarters from the bar's start, as fractions (3/2); duration 0 is a grace note;
    ~ ties the note to the next one of the same pitch."""
    fx = {}
    if not os.path.exists(path): return fx
    for ln, l in enumerate(open(path), 1):
        l = re.split(r'(?:^|\s)#', l)[0].strip()
        if not l: continue
        bar, st, *toks = l.split()
        if st not in W.STAVES: W.die(f'{path}:{ln}: staff {st!r}')
        ns = []
        for t in toks:
            m = re.fullmatch(r'([0-9/]+):([^:]+):([0-9/]+)(~?)', t)
            if not m: W.die(f'{path}:{ln}: bad note {t!r}')
            o, d = W.frac(m[1]), W.frac(m[3])
            for p in m[2].split(','): ns.append((o, W.midi(p), d, bool(m[4]), d == 0))
        fx[(int(bar), W.STAVES.index(st))] = ns
    return fx

def bars(w, mv):
    O = json.load(open(os.path.join(w['dir'], 'omr.json')))
    fx = parse_fixes(os.path.join(w['dir'], f'fixes-{mv}.txt'))
    out = []; clipped = []; m = W.movement(w, mv); bl = F(m['meter'][0] * 4, m['meter'][1])
    for j, (pg, k) in enumerate(W.bar_pages(w, mv)):
        b = []
        for s in range(3):
            if (j + 1, s) in fx: b.append(fx[(j + 1, s)]); continue
            ns = []
            for o, p, d, t, nm, g in O[pg]['measures'][k]['notes'][s]:
                o, d = W.frac(o), W.frac(d)
                if o >= bl: continue  # the OMR put a note past the bar's end
                if not g and o + d > bl: d = bl - o; clipped.append(f'{j+1} {W.STAVES[s]}')  # its duration, at the barline
                ns.append((o, p, d, t in ('start', 'continue'), g))
            b.append(ns)
        out.append(b)
    for b in out:  # a note read twice, as in two voices that share it: keep the longer
        for s in range(3):
            keep = {}
            for n in b[s]:
                k = (n[0], n[1], n[4])
                if k not in keep or n[2] > keep[k][2]: keep[k] = n
            b[s][:] = list(keep.values())
    if clipped: print(f'OMR durations cut at the barline in {len(clipped)} staves:', ', '.join(clipped))
    return out, fx

def sounding(bs, bl):
    """Join ties: [(start, pitch, dur, grace)] in quarters from the movement's start, per staff."""
    out = [[], [], []]
    for s in range(3):
        open_ = {}  # pitch -> index in out[s] of a note waiting for its tie
        for j, b in enumerate(bs):
            for o, p, d, tie, g in sorted(b[s], key=lambda n: (n[0], n[1])):
                t = j * bl + o
                if g: out[s].append([t - F(1, 8), p, F(1, 8), True]); continue
                i = open_.pop(p, None)
                if i is not None and out[s][i][0] + out[s][i][2] == t: out[s][i][2] += d
                else: out[s].append([t, p, d, False]); i = len(out[s]) - 1
                if tie: open_[p] = i
    return out

def check(bs, bl, fx):
    bad = []
    for j, b in enumerate(bs):
        for s in range(3):
            for o, p, d, tie, g in b[s]:
                if o < 0 or o >= bl: bad.append(f'bar {j+1} {W.STAVES[s]}: onset {o}')
                elif not g and o + d > bl: bad.append(f'bar {j+1} {W.STAVES[s]}: {W.name(p)} at {o} lasts {d}, past the barline')
                elif not g and not 0 < d <= bl: bad.append(f'bar {j+1} {W.STAVES[s]}: duration {d}')
            if not b[s] and (j + 1, s) not in fx and s == 0: pass
    return bad

def vlq(n):
    b = [n & 0x7f]; n >>= 7
    while n: b.insert(0, 0x80 | (n & 0x7f)); n >>= 7
    return bytes(b)

def track(events):
    """events: [(tick, order, bytes)] -> an MTrk chunk."""
    data = b''; last = 0
    for t, _, e in sorted(events, key=lambda x: (x[0], x[1])):
        data += vlq(t - last) + e; last = t
    data += b'\x00\xff\x2f\x00'
    return b'MTrk' + struct.pack('>I', len(data)) + data

def meta(kind, payload): return b'\xff' + bytes([kind]) + vlq(len(payload)) + payload

def write(w, mv, notes, nbars, out):
    m = W.movement(w, mv); bl = F(m['meter'][0] * 4, m['meter'][1])
    tick = lambda q: int(round(q * PPQ))
    us = int(60e6 / m['tempo'])
    t0 = [(0, 0, meta(0x03, b'Conductor')), (0, 1, meta(0x51, us.to_bytes(3, 'big'))),
          (0, 2, meta(0x58, bytes([m['meter'][0], {2: 1, 4: 2, 8: 3}[m['meter'][1]], 24, 8]))),
          (0, 3, meta(0x59, bytes([m['fifths'] & 0xff, 0])))]
    for bar, txt in m.get('marks', []): t0.append((tick((bar - 1) * bl), 4, meta(0x06, txt.encode())))
    t0.append((tick(nbars * bl), 9, b'\x00'[:0] + meta(0x01, b'end')))
    names = [('Violin', 0, 40), ('Piano RH', 1, 0), ('Piano LH', 2, 0)]
    vel = [84, 72, 66]
    chunks = [track(t0)]
    for s, (nm, ch, prog) in enumerate(names):
        ev = [(0, 0, meta(0x03, nm.encode())), (0, 1, bytes([0xc0 | ch, prog]))]
        if s == 0 and m.get('pizz'):
            (b0, q0), (b1, q1) = m['pizz']
            ev += [(tick((b0 - 1) * bl + q0), 1, bytes([0xc0, 45])), (tick((b1 - 1) * bl + q1), 1, bytes([0xc0, 40]))]
        for t, p, d, g in notes[s]:
            a, b = tick(t), tick(t + d)
            ev += [(a, 3, bytes([0x90 | ch, p, vel[s] - (10 if g else 0)])), (max(a + 1, b - 4), 2, bytes([0x80 | ch, p, 0]))]
        chunks.append(track(ev))
    with open(out, 'wb') as f: f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(chunks), PPQ) + b''.join(chunks))

def main():
    w = W.load(sys.argv[1]); mv = int(sys.argv[2]); m = W.movement(w, mv)
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(W.HERE, '..', '..', '..', m['out'])
    bl = F(m['meter'][0] * 4, m['meter'][1])
    bs, fx = bars(w, mv)
    bad = check(bs, bl, fx)
    for x in bad: print('check:', x)
    notes = sounding(bs, bl)
    write(w, mv, notes, len(bs), out)
    print(f'{len(bs)} bars, {sum(len(n) for n in notes)} notes ({", ".join(f"{W.STAVES[s]} {len(notes[s])}" for s in range(3))}), '
          f'{len(fx)} staves from the scan, {len(bad)} check failures -> {os.path.normpath(out)}')
    return 1 if bad else 0

if __name__ == '__main__': sys.exit(main())
