"""Vote across every reading of a movement: python3 fuse.py <work> <movement> [--truth]

Each bar's staff has up to four readings:
  as  Audiveris on the score (omr.json)
  ap  Audiveris on the violin part (omr.json), violin only
  ss  ScoreShift on the score (cache/<work>/scoreshift-score.json, from scoreshift_read.mjs)
  sp  ScoreShift on the violin part (cache/<work>/scoreshift-violin.json), violin only
A reading is compared with the others by its note heads' pitches, grace notes left out, as a
multiset. The vote takes the Audiveris reading (as or ap: the only readers whose rhythm build.py
uses) that the other readings agree with most, the violin part's on a tie (its staff is printed
at full size, the score's is cue-size), and marks it confirmed where another reader's
reading has exactly its heads. Writes cache/<work>/fused-<mv>.json: per bar and staff, the
source chosen, whether it is confirmed, and each reading's heads.

With --truth, each reading and the vote are scored against build.py's bars (the readings with
fixes-<mv>.txt), which is how the vote is measured; the vote itself never reads the truth or the
reference MIDI.

The readings are put into bars through Audiveris' measure geometry: ScoreShift's staves on a score
page are mapped onto Audiveris' image of it (cropped and scaled, see prep.py) by a fit of the
staves' tops and bottoms; the violin part's pages are read by both in the scan's own pixels. The
violin part's measures are aligned to the score's bars by their pitches (compare.py's alignment,
here against the score's own Audiveris reading of the violin staff).
"""
import collections, json, os, sys
from fractions import Fraction as F
import numpy as np
import work as W
import build as B

READERS = ('as', 'ap', 'ss', 'sp')

def ms(ns): return collections.Counter(p for p in ns)

def sim(a, b):
    """Jaccard similarity of two multisets of pitches (1 for two empty ones)."""
    if not a and not b: return 1.0
    return sum((a & b).values()) / sum((a | b).values())

def systems(measures):
    """Audiveris' measures of a page grouped by system: [[k, ...], ...], by their staves' tops."""
    out = []
    for k, m in enumerate(measures):
        if out and abs(measures[out[-1][-1]]['staves'][0][0] - m['staves'][0][0]) < 20: out[-1].append(k)
        else: out.append([k])
    return out

def fit_page(A, SS):
    """Map ScoreShift's scan pixels onto Audiveris' image: (scale, dx, dy), one scale for both
    axes (the image is the scan cropped and scaled). The scale is the ratio of the full-size staves'
    heights; the offsets the commonest over every pairing of the two readers' staves, the x offset
    from the systems' left ends."""
    ah = [b - t for g in A for t, b in g['staves'] if b - t > 0]
    sh = [st['bot'] - st['top'] for g in SS for st in g if st['size'] == 'big']
    if not ah or not sh: return None
    s = np.median(sorted(ah)[len(ah) // 3:]) / np.median(sh)  # the piano's staves: the larger ones
    mids = [(t + b) / 2 for g in A for t, b in g['staves']]
    offs = [m - s * (st['top'] + st['bot']) / 2 for m in mids for g in SS for st in g]
    h, e = np.histogram(offs, bins=np.arange(min(offs), max(offs) + 12, 8))
    i = h.argmax(); near = [o for o in offs if e[i] - 8 <= o <= e[i + 1] + 8]; dy = float(np.median(near))
    # x: each ScoreShift system's left end against the Audiveris system its staves map into
    dxs = []
    for g in SS:
        y = s * g[-1]['top'] + dy
        a = min(A, key=lambda q: min(abs(t - y) for t, b in q['staves']))
        dxs.append(a['left'] - s * min(st['x0'] for st in g))
    return s, float(np.median(dxs)), dy

def score_readings(w, mv, O, SSS):
    """ScoreShift's heads on the score, by bar and staff: {(bar index, staff): [midi, ...]},
    and the bars of a page it read."""
    BP = W.bar_pages(w, mv); inv = {(pg, k): j for j, (pg, k) in enumerate(BP)}
    out, read = collections.defaultdict(list), set()
    for pg in dict.fromkeys(pg for pg, k in BP):
        SS = SSS.get(pg)
        if not SS: continue
        M = O[pg]['measures']
        A = [{'ks': ks, 'left': M[ks[0]]['left'], 'staves': M[ks[0]]['staves']} for ks in systems(M)]
        f = fit_page(A, SS)
        if not f: continue
        s, dx, dy = f
        for k in range(len(M)):
            if (pg, k) in inv: read.update((inv[(pg, k)], st) for st in range(3))
        for g in SS:
            for st in g:
                my = s * (st['top'] + st['bot']) / 2 + dy
                a = min(A, key=lambda q: min(abs((t + b) / 2 - my) for t, b in q['staves']))
                si = min(range(len(a['staves'])), key=lambda i: abs(sum(a['staves'][i]) / 2 - my))
                if abs(sum(a['staves'][si]) / 2 - my) > a['staves'][si][1] - a['staves'][si][0]: continue
                for x, y, p in st['heads']:
                    X = s * x + dx
                    k = next((k for k in a['ks'] if M[k]['left'] - 4 <= X < M[k]['right'] + 4), None)
                    if k is not None and (pg, k) in inv: out[(inv[(pg, k)], si)].append(p)
    return out, read

def part_measures(w, mv, O):
    """The violin part's measures in reading order: [(page, k)]."""
    m = W.movement(w, mv)
    return [(pg, k) for pg in W.pages(*m['violin']) if not O.get(pg, {}).get('missing') for k in range(len(O[pg]['measures']))]

def align_part(seq, rows):
    """compare.py's alignment of the part's measures to the bars: {bar index: measure index},
    seq and rows as lists of pitch multisets."""
    n, k = len(seq), len(rows); INF = 1e9
    D = [[INF] * (k + 1) for _ in range(n + 1)]; P = [[None] * (k + 1) for _ in range(n + 1)]; D[0][0] = 0
    for i in range(n + 1):
        for j in range(k + 1):
            c = D[i][j]
            if c >= INF: continue
            for di, dj in ((1, 1), (1, 0), (0, 1)):
                ii, jj = i + di, j + dj
                if ii > n or jj > k: continue
                cc = c + (1 - sim(seq[i], rows[j]) if di and dj else 0.9)
                if cc < D[ii][jj]: D[ii][jj] = cc; P[ii][jj] = (i, j, bool(di and dj))
    out = {}; i, j = n, k
    while (i, j) != (0, 0):
        pi, pj, one = P[i][j]
        if one: out[pj] = pi
        i, j = pi, pj
    return out

def part_readings(w, mv, O, SSP):
    """ScoreShift's heads on the violin part, by the part's measure: {(page, k): [midi, ...]}.
    Both readers read the part's pages in the scan's pixels."""
    out = collections.defaultdict(list)
    for pg in W.pages(*W.movement(w, mv)['violin']):
        if O.get(pg, {}).get('missing') or not SSP.get(pg): continue
        M = O[pg]['measures']
        for g in SSP[pg]:
            for st in g:
                for x, y, p in st['heads']:
                    k = next((k for k, m in enumerate(M) if m['left'] - 4 <= x < m['right'] + 4 and
                              m['staves'][0][0] - 3 * (m['staves'][0][1] - m['staves'][0][0]) / 4 <= (st['top'] + st['bot']) / 2 <= m['staves'][0][1] + 3 * (m['staves'][0][1] - m['staves'][0][0]) / 4), None)
                    if k is not None: out[(pg, k)].append(p)
    return out

def vote(R):
    """R: {reader: Counter}. The Audiveris reading the others agree with most, and whether another
    reader's reading has exactly its heads: (reader, confirmed, support)."""
    best = None
    for r in ('as', 'ap'):
        if r not in R: continue
        sup = sum(sim(R[r], R[o]) for o in R if o != r)
        conf = any(R[o] == R[r] for o in R if o != r)
        key = (conf, sup, r == 'ap')  # (a tie goes to the violin part, printed at full size)
        if best is None or key > best[0]: best = (key, r)
    return (best[1], best[0][0], best[0][1]) if best else (None, False, 0)

def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    w = W.load(a[0]); mv = int(a[1])
    O = json.load(open(os.path.join(w['dir'], 'omr.json')))
    load = lambda part: json.load(open(W.cache(w, f'scoreshift-{part}.json'))) if os.path.exists(W.cache(w, f'scoreshift-{part}.json')) else {}
    SSS, SSP = load('score'), load('violin')
    BP = W.bar_pages(w, mv); nb = len(BP)
    bl = F(W.movement(w, mv)['meter'][0] * 4, W.movement(w, mv)['meter'][1])
    def heads(ns):
        """The heads of an Audiveris reading as build.py keeps them: none past the bar's end, and a
        note read twice (in two voices that share it) once."""
        return [p for o, p in dict.fromkeys((W.frac(n[0]), n[1]) for n in ns if not n[5] and W.frac(n[0]) < bl)]
    rows = {('as', j, s): heads(O[pg]['measures'][k]['notes'][s]) for j, (pg, k) in enumerate(BP) for s in range(3)}
    ss, ss_read = score_readings(w, mv, O, SSS)
    for (j, s) in ss_read: rows[('ss', j, s)] = ss.get((j, s), [])
    if 'violin' in W.movement(w, mv):
        pm = part_measures(w, mv, O)
        seq = [ms(heads(O[pg]['measures'][k]['notes'][0])) for pg, k in pm]
        al = align_part(seq, [ms(rows[('as', j, 0)]) for j in range(nb)])
        sp = part_readings(w, mv, O, SSP)
        for j, i in al.items():
            pg, k = pm[i]; rows[('ap', j, 0)] = heads(O[pg]['measures'][k]['notes'][0])
            if SSP.get(pg): rows[('sp', j, 0)] = sp.get((pg, k), [])
    res, out = {}, {}
    for j in range(nb):
        for s in range(3):
            R = {r: ms(rows[(r, j, s)]) for r in READERS if (r, j, s) in rows}
            src, conf, sup = vote(R)
            res[(j, s)] = (src, conf, R)
            out[f'{j + 1} {W.STAVES[s]}'] = {'source': src, 'confirmed': conf, 'support': round(sup, 3),
                                              'readings': {r: sorted(c.elements()) for r, c in R.items()}}
    json.dump(out, open(W.cache(w, f'fused-{mv}.json'), 'w'), indent=0)
    n = len(res); nc = sum(1 for v in res.values() if v[1])
    print(f'{n} staves: {nc} confirmed by a second reader, {n - nc} to check by eye')
    print('chosen:', dict(collections.Counter(v[0] for v in res.values())))
    if '--truth' not in sys.argv: return
    bs, fx = B.bars(w, mv)
    T = {(j, s): ms(p for o, p, d, t, g in bs[j][s] if not g) for j in range(nb) for s in range(3)}
    print('\nagainst the checked transcription (heads exactly right, per staff):')
    for s in range(3):
        line = []
        for r in READERS:
            have = [(j, s) for j in range(nb) if r in res[(j, s)][2]]
            if have: line.append(f'{r} {sum(res[k][2][r] == T[k] for k in have)}/{len(have)}')
        ch = sum(res[(j, s)][0] and res[(j, s)][2][res[(j, s)][0]] == T[(j, s)] for j in range(nb))
        orc = sum(any(res[(j, s)][2].get(r) == T[(j, s)] for r in ('as', 'ap')) for j in range(nb))
        line.append(f'vote {ch}/{nb}  best Audiveris reading {orc}/{nb}')
        print(f'  {W.STAVES[s]}: ' + '  '.join(line))
    right = lambda k: res[k][0] and res[k][2][res[k][0]] == T[k]
    cf = [k for k in res if res[k][1]]; un = [k for k in res if not res[k][1]]
    print(f'  confirmed: {sum(map(right, cf))}/{len(cf)} right; to check: {sum(map(right, un))}/{len(un)} right')
    print(f'  wrong yet confirmed:', ', '.join(f'{j + 1} {W.STAVES[s]}' for j, s in cf if not right((j, s))) or 'none')

if __name__ == '__main__': main()
