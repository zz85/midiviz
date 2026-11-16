"""Crop bars of the scan to read them closely: python3 zoom.py <work> <movement> <bar>[:<staff>[:<scale>]] ...

Staff is VN, RH, LH or all (the default); the crops are stacked in cache/<work>/zoom.png."""
import json, os, sys
from PIL import Image
import work as W

def main():
    w = W.load(sys.argv[1]); mv = int(sys.argv[2]); O = json.load(open(os.path.join(w['dir'], 'omr.json'))); BP = W.bar_pages(w, mv)
    ims = []
    for spec in sys.argv[3:]:
        b, st, sc = (spec.split(':') + ['all', '1'][len(spec.split(':')) - 1:])[:3]
        pg, k = BP[int(b) - 1]; x = O[pg]['measures'][k]; staves = x['staves']
        lo, hi = (staves[0], staves[-1]) if st == 'all' else (staves[W.STAVES.index(st)],) * 2
        sp = (lo[1] - lo[0]) / 4
        im = Image.open(W.cache(w, 'omr', pg + '.png')).crop((int(x['left'] - 40), int(lo[0] - 4.5 * sp), int(x['right'] + 40), int(hi[1] + 4.5 * sp))).convert('RGB')
        ims.append(im.resize((int(im.size[0] * float(sc)), int(im.size[1] * float(sc)))))
    o = Image.new('RGB', (max(i.size[0] for i in ims), sum(i.size[1] for i in ims)), 'white'); y = 0
    for i in ims: o.paste(i, (0, y)); y += i.size[1]
    o.save(W.cache(w, 'zoom.png')); print(W.cache(w, 'zoom.png'))

if __name__ == '__main__': main()
