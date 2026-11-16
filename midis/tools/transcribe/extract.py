"""Read Audiveris' output into works/<work>/omr.json: python3 extract.py <work> [part ...]

For each page, each measure (an Audiveris stack) in order, with its place on the page (left, right,
and the top and bottom line of each staff, in the pixels of cache/<work>/omr/<page>.png) and its
notes by staff: [onset, midi, duration, tie, spelling, grace], onset and duration in quarters from
the measure's start, as the MusicXML gives them. Staff 0 is the violin, 1 and 2 the piano's upper
and lower staff. A grace note has duration 0 and grace true."""
import json, os, sys, zipfile
import xml.etree.ElementTree as ET
import music21 as m21
import work as W

def geometry(book):
    r = ET.fromstring(zipfile.ZipFile(book).read('sheet#1/sheet#1.xml'))
    out = []
    for sy in r.iter('system'):
        staves = []
        for part in sy.findall('part'):
            for st in part.findall('staff'):
                ys = [sum(float(p.get('y')) for p in l.findall('point')) / len(l.findall('point')) for l in st.find('lines').findall('line')]
                staves.append([round(min(ys), 1), round(max(ys), 1)])
        for s in sy.findall('stack'):
            out.append({'left': float(s.get('left')), 'right': float(s.get('right')), 'staves': staves})
    return out

def notes(xml, part):
    s = m21.converter.parse(xml)
    meas = {}  # (measure number, suffix) -> [[], [], []]
    for p in s.parts:
        pid = p.id or ''
        st = 0 if part == 'violin' or 'Staff' not in pid else (1 if pid.endswith('Staff1') else 2)
        for m in p.getElementsByClass('Measure'):
            key = (m.number, m.numberSuffix or '')
            if key not in meas: meas[key] = [[], [], []]
            m_ = meas[key]
            for n in m.recurse().notes:
                off = float(n.getOffsetInHierarchy(m)); g = bool(n.duration.isGrace)
                for pp in (n.pitches if n.isChord else [n.pitch]):
                    m_[st].append([round(off, 4), pp.midi, 0 if g else round(float(n.quarterLength), 4),
                                               n.tie.type if n.tie else None, pp.nameWithOctave.replace('-', 'b'), g])
    # by number: a part that leaves out a measure (Audiveris drops a violin measure it reads as empty)
    # mustn't move the measures after it
    return [meas[k] for k in sorted(meas)]

def main():
    w = W.load(sys.argv[1]); parts = sys.argv[2:] or ['score', 'violin']
    path = os.path.join(w['dir'], 'omr.json')
    out = json.load(open(path)) if os.path.exists(path) else {}
    for part in parts:
        for pg in W.pages(*w['parts'][part]):
            book = W.cache(w, 'omr', pg + '.omr'); xml = W.cache(w, 'omr', 'x', pg, pg + '.xml')
            if not os.path.exists(book) or not os.path.exists(xml): out[pg] = {'part': part, 'missing': True}; print(pg, 'missing'); continue
            G = geometry(book); N = notes(xml, part)
            if len(G) != len(N): print(f'{pg}: {len(G)} stacks, {len(N)} MusicXML measures', file=sys.stderr)
            out[pg] = {'part': part, 'measures': [dict(g, notes=n) for g, n in zip(G, N + [[[], [], []]] * (len(G) - len(N)))]}
            print(pg, len(G))
    json.dump(out, open(path, 'w'), separators=(',', ':'))
    print(path, os.path.getsize(path))

if __name__ == '__main__': main()
