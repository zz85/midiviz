"""Find the bars the OMR may have wrong: python3 compare.py <work> <movement> <reference.mid> VN RH LH [--sheets]

VN, RH and LH are the reference's tracks for each staff, by index in the file, such as 1,2 3 4.
The reference is any MIDI of the piece, such as one from the web whose licence doesn't let us
publish it: it isn't copied anywhere. It only points at bars to check. Each bar's staff is
  strict  the OMR's notes (the score's, or the violin part's) sound the reference's pitches at its
          onsets, for about as long
  onset   the same pitches and onsets, other lengths (a reference played rather than notated)
  pitch   the same pitches, other onsets
  bad     neither
and "fix" where fixes-<movement>.txt gives it. Writes cache/<work>/flags-<mv>.json; with --sheets,
review sheets of each bar that is pitch or bad and has no fix, three bars to a sheet:
the scan of the bar's system, the reference's notes (red) and the OMR's below (cache/<work>/rev/)."""
import collections, json, os, sys
from fractions import Fraction as F
import work as W, smf, build as B

def ref_bars(path, groups, bl, nbars):
    ppq, tracks = smf.read(path)
    out = [[[], [], []] for _ in range(nbars)]
    first = min(t for g in groups for ti in g for t, *_ in tracks[ti])
    lead = first // int(ppq * bl) * int(ppq * bl)  # silent bars before the music
    for s, g in enumerate(groups):
        for ti in g:
            for t, p, d, v, pr in tracks[ti]:
                q = F(t - lead, ppq); j = int(q // bl)
                if 0 <= j < nbars: out[j][s].append((q - j * bl, p, F(d, ppq)))
    return out

def sound(notes):
    """{(onset, pitch): duration} with ties joined, grace notes left out."""
    out = {}
    for o, p, d, tie, g in sorted(notes, key=lambda n: (n[0], n[1])):
        if g: continue
        k = [k for k in out if k[1] == p and k[0] + out[k] == o and k in tied]
        if k: out[k[-1]] += d; tied.discard(k[-1])
        else: out[(o, p)] = d
        if tie: tied.add((o, p) if not k else k[-1])
    return out
tied = set()

ORDER = ['strict', 'onset', 'pitch', 'bad']

def classify(om, ref, carried=()):
    """carried: pitches tied over from the bar before, which a reference may hold as one note there."""
    r = _classify(om, ref, ())
    if carried and r != 'strict': r = min(r, _classify(om, ref, carried), key=ORDER.index)
    return r

def _classify(om, ref, carried):
    tied.clear(); so = {k: d for k, d in sound(om).items() if not (k[0] == 0 and k[1] in carried)}; mi = {(o, p): d for o, p, d in ref}
    grace = lambda o, d: o % 1 == F(3, 4) and d <= F(1, 4)  # a reference's grace note, timed just before the beat
    mi = {k: d for k, d in mi.items() if not grace(k[0], d)}
    if set(so) == set(mi):
        ok = all(so[k] * F(1, 2) - F(1, 8) <= mi[k] <= so[k] + F(1, 8) for k in mi)
        return 'strict' if ok else 'onset'
    if collections.Counter(p for _, p in so) == collections.Counter(p for _, p in mi): return 'pitch'
    return 'bad'

def part_bars(w, mv, O, ref):
    """The violin part's measures, aligned to the bars by their pitches (the part's measures don't
    match the score's pages one to one: its own systems, and the OMR may miss or split a measure)."""
    m = W.movement(w, mv)
    if 'violin' not in m: return {}
    seq = [x['notes'][0] for pg in W.pages(*m['violin']) if not O.get(pg, {}).get('missing') for x in O[pg]['measures']]
    pc = lambda ns: collections.Counter(n[1] for n in ns if not (len(n) > 4 and n[4]))
    def sim(a, b):
        A, Bc = pc(a), pc(b)
        return 1.0 if not A and not Bc else sum((A & Bc).values()) / max(1, sum((A | Bc).values()))
    R = [[(o, p, d, False, False) for o, p, d in r[0]] for r in ref]
    n, k = len(seq), len(R); INF = 1e9; D = [[INF] * (k + 1) for _ in range(n + 1)]; P = [[None] * (k + 1) for _ in range(n + 1)]
    D[0][0] = 0
    for i in range(n + 1):
        for j in range(k + 1):
            c = D[i][j]
            if c >= INF: continue
            for di, dj, cost in ((1, 1, None), (1, 0, 0.9), (0, 1, 0.9)):
                ii, jj = i + di, j + dj
                if ii > n or jj > k: continue
                cc = c + (1 - sim(seq[i], R[j]) if cost is None else cost)
                if cc < D[ii][jj]: D[ii][jj] = cc; P[ii][jj] = (i, j, cost is None)
    out = {}; i, j = n, k
    while (i, j) != (0, 0):
        pi, pj, one = P[i][j]
        if one: out[pj] = [(W.frac(o), p, W.frac(d), t in ('start', 'continue'), g) for o, p, d, t, nm, g in seq[pi]]
        i, j = pi, pj
    return out

def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    w = W.load(a[0]); mv = int(a[1]); m = W.movement(w, mv); bl = F(m['meter'][0] * 4, m['meter'][1])
    groups = [[int(x) for x in g.split(',')] for g in a[3:6]]
    bs, fx = B.bars(w, mv)
    O = json.load(open(os.path.join(w['dir'], 'omr.json')))
    # the score's own OMR reading, without the fixes
    score = []
    for pg, k in W.bar_pages(w, mv):
        score.append([[(W.frac(o), p, W.frac(d), t in ('start', 'continue'), g) for o, p, d, t, nm, g in O[pg]['measures'][k]['notes'][s]] for s in range(3)])
    ref = ref_bars(a[2], groups, bl, len(bs))
    part = part_bars(w, mv, O, ref)
    order = ['strict', 'onset', 'pitch', 'bad']
    res = {}
    for j in range(len(bs)):
        for s in range(3):
            carried = {p for o, p, d, tie, g in bs[j - 1][s] if tie and o + d == bl} if j else set()
            cands = [('score', score[j][s])] + ([('part', part[j])] if s == 0 and j in part else [])
            best = min(((classify(n, ref[j][s], carried), src) for src, n in cands), key=lambda x: order.index(x[0]))
            fixed = (j + 1, s) in fx
            res[f'{j+1} {W.STAVES[s]}'] = {'class': best[0], 'source': best[1], 'fix': fixed,
                                          'fix_class': classify(fx[(j + 1, s)], ref[j][s], carried) if fixed else None}
    json.dump(res, open(W.cache(w, f'flags-{mv}.json'), 'w'), indent=0)
    c = collections.Counter((k.split()[1], v['class']) for k, v in res.items())
    for s in W.STAVES: print(s, ' '.join(f'{x} {c[(s, x)]}' for x in order))
    need = sorted({int(k.split()[0]) for k, v in res.items() if v['class'] in ('pitch', 'bad') and not v['fix']})
    print(f'{len(need)} bars to check (pitch or bad, no fix):', ' '.join(map(str, need)))
    differ = [k for k, v in res.items() if v['fix'] and v['fix_class'] in ('pitch', 'bad')]
    print(f'{len(differ)} fixed staves whose pitches or onsets differ from the reference (check that the fix says why):', ', '.join(differ))
    if '--sheets' in sys.argv: sheets(w, mv, need, res, ref, score, part)

def sheets(w, mv, need, res, ref, score, part):
    from PIL import Image, ImageDraw, ImageFont
    O = json.load(open(os.path.join(w['dir'], 'omr.json'))); BP = W.bar_pages(w, mv)
    font = ImageFont.load_default(size=24)
    def txt(ns):
        by = collections.defaultdict(list)
        for n in ns: by[n[0]].append(W.name(n[1]))
        return '  '.join(f'{float(o):g}:' + ','.join(v) for o, v in sorted(by.items()))
    tiles = []
    for b in need:
        pg, k = BP[b - 1]; x = O[pg]['measures'][k]; st = x['staves']; sp = (st[0][1] - st[0][0]) / 4
        im = Image.open(W.cache(w, 'omr', pg + '.png')).crop((int(x['left'] - 60), int(st[0][0] - 5 * sp), int(x['right'] + 30), int(st[-1][1] + 5 * sp))).convert('RGB')
        sc = 900 / im.size[1]; im = im.resize((int(im.size[0] * sc), 900))
        lines = [f'BAR {b} ({pg} stack {k + 1})']
        for s in range(3):
            r = res[f'{b} {W.STAVES[s]}']
            if r['class'] in ('strict', 'onset'): lines.append(f"{W.STAVES[s]}: ok ({r['source']})"); continue
            lines.append(f'{W.STAVES[s]} ref: ' + txt(ref[b - 1][s]))
            src = part.get(b - 1) if r['source'] == 'part' else score[b - 1][s]
            lines.append(f"{W.STAVES[s]} {r['source']}: " + txt([n for n in (src or []) if not n[4]]))
        T = Image.new('RGB', (max(im.size[0], 1000), 910 + 30 * len(lines)), 'white'); T.paste(im, (0, 0)); d = ImageDraw.Draw(T)
        for i, l in enumerate(lines): d.text((6, 904 + 30 * i), l[:110], fill=(200, 0, 0) if ' ref:' in l else 0, font=font)
        tiles.append(T)
    for n, i in enumerate(range(0, len(tiles), 3)):
        ts = tiles[i:i + 3]; S = Image.new('RGB', (sum(t.size[0] for t in ts) + 20 * len(ts), max(t.size[1] for t in ts)), (220, 220, 220)); x = 0
        for t in ts: S.paste(t, (x, 0)); x += t.size[0] + 20
        S.save(W.cache(w, 'rev', f'm{mv}_{n:03d}.png'))
    print(f'{(len(tiles) + 2) // 3} sheets in', W.cache(w, 'rev'))

if __name__ == '__main__': main()
