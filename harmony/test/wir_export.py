"""Exports When in Rome analyses with their scores as JSON for harmony/test/bps.js.

  git clone https://github.com/MarkGotham/When-in-Rome harmony/data/When-in-Rome
  python harmony/test/wir_export.py [chorales|wtc|lieder|all]   (needs music21)

Writes harmony/data/wir/<set>/<id>.json:
  { notes: [[on, pitch, dur]], beats: [[time, strength]], chords: [[on, off, keyTonic, keyMode, root, quality, inversion, rn]] }
times in quarter notes. When in Rome is CC BY-SA 4.0; the Bach chorales come
from music21's corpus, the other scores from the repository.
"""
import json, os, sys, glob, warnings
import music21
from music21 import converter, corpus, roman, stream

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
WIR = os.path.join(HERE, "..", "data", "When-in-Rome", "Corpus")
OUT = os.path.join(HERE, "..", "data", "wir")

def quality(rn):
    c = rn
    if c.isAugmentedSixth() if hasattr(c, "isAugmentedSixth") else False:
        return "a6"
    if c.isSeventh():
        if c.isDominantSeventh(): return "D7"
        if c.isDiminishedSeventh(): return "d7"
        if c.isHalfDiminishedSeventh(): return "h7"
        name = c.commonName
        if name == "major seventh chord": return "M7"
        if name == "minor seventh chord": return "m7"
        return None
    if c.isTriad():
        if c.isMajorTriad(): return "M"
        if c.isMinorTriad(): return "m"
        if c.isDiminishedTriad(): return "d"
        if c.isAugmentedTriad(): return "a"
    return None

def measure_offsets(s):
    """Offset (quarters) of each measure number in the first part."""
    part = s.parts[0] if hasattr(s, "parts") and len(s.parts) else s
    return {m.number: float(m.offset) for m in part.getElementsByClass(stream.Measure)}

def export(score, analysis_path, out_path):
    a = converter.parse(analysis_path, format="romantext")
    sm, am = measure_offsets(score), measure_offsets(a)
    common = sorted(set(sm) & set(am))
    if not common:
        return False
    # align on the first measure both have
    shift = sm[common[0]] - am[common[0]]
    notes = []
    for n in (score.flatten() if hasattr(score, "flatten") else score.flat).notes:
        for p in (n.pitches if n.isChord else [n.pitch]):
            if n.tie is not None and n.tie.type in ("continue", "stop"):
                # extend the earlier note instead of starting a new one
                for prev in reversed(notes):
                    if prev[1] == p.midi and abs(prev[0] + prev[2] - float(n.offset)) < 1e-6:
                        prev[2] += float(n.quarterLength)
                        break
                continue
            notes.append([float(n.offset), p.midi, float(n.quarterLength)])
    # beats from time signatures, per measure
    beats = []
    part = score.parts[0]
    for m in part.getElementsByClass(stream.Measure):
        ts = m.timeSignature or m.getContextByClass("TimeSignature")
        if ts is None:
            continue
        bl = ts.beatDuration.quarterLength
        start = float(m.offset)
        length = float(m.duration.quarterLength)
        pad = float(m.paddingLeft or 0)
        t = start - pad if pad else start
        k = 0
        while t < start + length - 1e-6:
            if t >= start - 1e-6:
                beats.append([round(t, 4), 1 if k == 0 else 0.4])
            t += bl
            k += 1
    rns = list((a.flatten() if hasattr(a, "flatten") else a.flat).getElementsByClass(roman.RomanNumeral))
    end = max(n[0] + n[2] for n in notes)
    chords = []
    for i, rn in enumerate(rns):
        on = float(rn.offset) + shift
        off = float(rns[i + 1].offset) + shift if i + 1 < len(rns) else end
        if off <= on:
            continue
        try:
            q = quality(rn)
            root = rn.root().pitchClass
            inv = rn.inversion() if q else 0
        except Exception:
            continue
        key = rn.key
        chords.append([on, off, key.tonic.pitchClass, key.mode, root if q != "a6" else None, q, inv, rn.figure])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump({"notes": notes, "beats": beats, "chords": chords}, f)
    return True

def chorales():
    for d in sorted(glob.glob(os.path.join(WIR, "Early_Choral", "Bach,_Johann_Sebastian", "Chorales", "*"))):
        meta = json.load(open(os.path.join(d, "remote.json")))
        ref = meta.get("remote_score_music21")
        an = os.path.join(d, "analysis.txt")
        if not ref or not os.path.exists(an):
            continue
        try:
            s = corpus.parse(ref)
        except Exception as e:
            print("skip", d, e); continue
        yield os.path.basename(d), s, an

def local(sub):
    for sc in sorted(glob.glob(os.path.join(WIR, sub, "**", "score.mxl"), recursive=True)):
        d = os.path.dirname(sc)
        an = os.path.join(d, "analysis.txt")
        if not os.path.exists(an):
            continue
        try:
            s = converter.parse(sc)
        except Exception as e:
            print("skip", d, e); continue
        yield os.path.relpath(d, os.path.join(WIR, sub)).replace("/", "__"), s, an

SETS = {
    "chorales": chorales,
    "wtc": lambda: local("Keyboard_Other/Bach,_Johann_Sebastian/The_Well-Tempered_Clavier_I"),
    "lieder": lambda: local("OpenScore-LiederCorpus"),
}

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "chorales"
    for name in (SETS if which == "all" else [which]):
        ok = 0
        for pid, s, an in SETS[name]():
            try:
                if export(s, an, os.path.join(OUT, name, pid + ".json")):
                    ok += 1
            except Exception as e:
                print("fail", pid, e)
        print(name, ok, "pieces")
