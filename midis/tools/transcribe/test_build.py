# python3 -m unittest midis/tools/transcribe/test_build.py  (needs only the committed files)
import hashlib, os, sys, tempfile, unittest
from fractions import Fraction as F
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import work as W, build as B, smf

ROOT = os.path.join(W.HERE, '..', '..', '..')

class Op78(unittest.TestCase):
    w = W.load('brahms_op78')

    def test_pitches(self):
        self.assertEqual([W.midi(x) for x in ('C4', 'Bb3', 'F#5', 'Cb4', 'E##4', 'G1')], [60, 58, 78, 59, 66, 31])
        self.assertRaises(ValueError, W.midi, 'H4')

    def test_bars_fit(self):
        bs, fx = B.bars(self.w, 1)
        self.assertEqual(len(bs), 243)
        self.assertEqual(B.check(bs, F(6), fx), [])
        self.assertEqual(B.parse_fixes(os.path.join(self.w['dir'], 'fixes-1.txt'))[(149, 2)][4:],
                         [(F(3), 31, F(3), False, False), (F(3), 43, F(3), False, False), (F(3), 52, F(3), False, False), (F(3), 59, F(3), False, False)])

    def test_reproduces_committed_midi(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'm.mid')
            sys.stdout, so = open(os.devnull, 'w'), sys.stdout
            try: sys.argv = ['build.py', 'brahms_op78', '1', out]; B.main()
            finally: sys.stdout = so
            new = open(out, 'rb').read()
        old = open(os.path.join(ROOT, self.w['movements']['1']['out']), 'rb').read()
        self.assertEqual(hashlib.sha256(new).hexdigest(), hashlib.sha256(old).hexdigest(), 'run build.py and commit the MIDI it writes')
        ppq, tr = smf.read(os.path.join(ROOT, 'duo/midis/brahms_op78_1.mid'))
        self.assertEqual([len(t) for t in tr], [0, 1368, 2271, 1810])
        pizz = [n for n in tr[1] if n[4] == 45]
        self.assertEqual((pizz[0][0] // (6 * ppq) + 1, pizz[-1][0] // (6 * ppq) + 1), (82, 90))

if __name__ == '__main__': unittest.main()
