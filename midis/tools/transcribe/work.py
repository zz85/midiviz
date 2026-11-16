"""Shared helpers: a work's config, its paths, and note names.

A work lives in works/<id>/: work.json (source, pages, movements), omr.json (what extract.py read
from the OMR), and per movement verdicts-<mv>.txt and fixes-<mv>.txt. Scans, OMR output and review
sheets go in the cache directory, $TRANSCRIBE_CACHE or ./cache/<id>, which isn't committed."""
import json, os, sys
from fractions import Fraction as F

HERE = os.path.dirname(os.path.abspath(__file__))

def load(wid):
    d = os.path.join(HERE, 'works', wid)
    w = json.load(open(os.path.join(d, 'work.json')))
    w['id'] = wid; w['dir'] = d
    w['cache'] = os.path.join(os.environ.get('TRANSCRIBE_CACHE', os.path.join(HERE, 'cache')), wid)
    return w

def cache(w, *p):
    q = os.path.join(w['cache'], *p); os.makedirs(os.path.dirname(q), exist_ok=True); return q

def page(n): return f'p{n:04d}'

def pages(lo, hi): return [page(i) for i in range(lo, hi + 1)]

STAVES = ['VN', 'RH', 'LH']
SH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
FL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
STEP = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def name(p, flats=False): return (FL if flats else SH)[p % 12] + str(p // 12 - 1)

def midi(s):
    """'Bb3' -> 58, 'F#5' -> 78, 'E##4', 'Cb4' -> 59 (octave as written, as in scientific pitch)."""
    i = 1; acc = 0
    while i < len(s) and s[i] in '#b': acc += 1 if s[i] == '#' else -1; i += 1
    if s[0] not in STEP or not s[i:].lstrip('-').isdigit(): raise ValueError(f'bad pitch {s!r}')
    return 12 * (int(s[i:]) + 1) + STEP[s[0]] + acc

def frac(s): return F(s).limit_denominator(96)

def movement(w, mv):
    m = w['movements'][str(mv)]
    return m

def bar_pages(w, mv):
    """[(page, index on page)] for each bar of the movement, from the stack count of each page."""
    m = movement(w, mv)
    return [(pg, k) for pg, n in m['score_stacks'] for k in range(n)]

def die(msg): print(msg, file=sys.stderr); sys.exit(1)
