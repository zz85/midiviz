"""Download a work's scans into the cache: python3 fetch.py <work> [first last]

From the library's IIIF image server where work.json gives "iiif" (a URL with {n}), or from a PDF
(work.json "pdf", a URL or a path, such as an IMSLP download), one image per page."""
import os, subprocess, sys, urllib.request
import work as W

def get(url, out):
    req = urllib.request.Request(url, headers={'User-Agent': 'midiviz-transcribe/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r, open(out + '.part', 'wb') as f: f.write(r.read())
    os.replace(out + '.part', out)

def main():
    w = W.load(sys.argv[1]); src = w['source']
    lo, hi = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1, src['pages'])
    if 'iiif' in src:
        for n in range(lo, hi + 1):
            out = W.cache(w, 'scan', W.page(n) + '.jpg')
            if os.path.exists(out): continue
            get(src['iiif'].format(n=n), out); print(out)
    elif 'pdf' in src:
        pdf = W.cache(w, 'scan', 'source.pdf')
        if not os.path.exists(pdf):
            if os.path.exists(src['pdf']): pdf = src['pdf']
            else: get(src['pdf'], pdf)
        # pdftoppm (poppler) at 400 dpi, pages named p0001.png ...
        subprocess.run(['pdftoppm', '-r', '400', '-gray', '-png', '-f', str(lo), '-l', str(hi), pdf, W.cache(w, 'scan', 'p')], check=True)
        for n in range(lo, hi + 1):
            for a in (f'p-{n}.png', f'p-{n:02d}.png', f'p-{n:03d}.png'):
                a = W.cache(w, 'scan', a)
                if os.path.exists(a): os.replace(a, W.cache(w, 'scan', W.page(n) + '.png'))
    else: W.die('work.json source has neither "iiif" nor "pdf"')

if __name__ == '__main__': main()
