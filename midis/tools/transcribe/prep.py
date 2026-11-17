"""Prepare scans for OMR: python3 prep.py <work> [part]

Crops each page of the score (or "violin") to its printed area and scales it 1.25x in grey:
Audiveris reads the 1879 engraving's small note heads and thin stems better at that size, a staff space of about 26 px
(cache/<work>/omr/<page>.png)."""
import glob, os, sys
import numpy as np
from PIL import Image
import work as W

SCALE = 1.25  # staff spacing about 26 px, from 21 in the 1879 scan

def crop_box(im):
    """The printed area of a page, with a margin: (x0, y0, x1, y1) in the scan's pixels."""
    a = np.asarray(im.convert('L'))
    ink = a < 128
    # the scanner's black surround: rows, then columns of that band, that are almost all dark
    r = np.where(ink.mean(1) < 0.5)[0]; y0, y1 = r[0], r[-1] + 1
    c = np.where(ink[y0:y1].mean(0) < 0.5)[0]; x0, x1 = c[0], c[-1] + 1
    # inside it, the printed area, with a margin
    band = ink[y0:y1, x0:x1]
    h2, w2 = band.shape
    rows = np.where(band[:, w2 // 10: -w2 // 10].mean(1) > 0.03)[0]; cols = np.where(band[h2 // 10: -h2 // 10].mean(0) > 0.03)[0]
    m = 60
    y0, y1 = max(y0, y0 + rows[0] - m), min(y1, y0 + rows[-1] + m)
    x0, x1 = max(x0, x0 + cols[0] - m), min(x1, x0 + cols[-1] + m)
    return int(x0), int(y0), int(x1), int(y1)

def prep(src, out):
    im = Image.open(src).convert('L')
    c = im.crop(crop_box(im))
    c.resize((int(c.size[0] * SCALE), int(c.size[1] * SCALE)), Image.LANCZOS).save(out)

def main():
    w = W.load(sys.argv[1]); part = sys.argv[2] if len(sys.argv) > 2 else 'score'
    lo, hi = w['parts'][part]
    for pg in W.pages(lo, hi):
        src = next(iter(glob.glob(W.cache(w, 'scan', pg + '.*'))), None)
        if not src: W.die(f'{pg}: no scan; run fetch.py first')
        out = W.cache(w, 'omr', pg + '.png')
        if not os.path.exists(out): prep(src, out); print(out)

if __name__ == '__main__': main()
