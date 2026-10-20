# AugmentedNet in the browser

[#042](../042_augmentednet.html) runs **AugmentedNet** (Néstor Nápoles López,
Mark Gotham and Ichiro Fujinaga, *AugmentedNet: A Roman Numeral Analysis
Network with Synthetic Training Examples and Additional Tonal Tasks*, ISMIR
2021; [github.com/napulen/AugmentedNet](https://github.com/napulen/AugmentedNet),
v1.9, MIT) on onnxruntime-web 1.30, next to #041's hand-built analyser
([harmony/](../harmony/research/01_harmony.md)). According to its README,
AugmentedNet powers the analysis features in Sibelius and Vimu.

```
augnet/
  augnet.js              encoding, batching, decoding (ported from AugmentedNet/inference.py), MIDI spelling
  worker.js              onnxruntime-web session in a module worker
  augmentednet.onnx      the network, 460 KB (105,084 parameters)
  vocabulary.json        class lists, the chord vocabulary and the music21 tables the decoder needs
  tools/export_augmentednet.py   Keras .hdf5 → ONNX, vocabulary, test fixture
  test/augnet.test.js    node --test augnet/test/augnet.test.js
```

## The network

Inputs, one row per 32nd note, 640 rows per sequence (padded with −1):

- `X_Bass19`: the lowest note's letter (7) and pitch class (12)
- `X_Chromagram19`: every sounding note's letter and pitch class
- `X_MeasureNoteOnset14`: 7-bit counters since the last bar line and the last onset

The letters matter: C♯ and D♭ are different inputs, so the notes must be
spelled. Three convolutional stacks (one per input, dense skip connections),
two dense layers, two bidirectional GRUs, and nine heads (logits per frame):
local key and tonicized key (38 spelled keys), Roman numeral (31 common
numerals), pitch-class set (121), the bass, tenor, alto and soprano of the
chord as voiced (35 spellings each), and harmonic rhythm (7 durations; 0 marks
a chord onset).

## Decoding

As in `inference.py`: a chord starts wherever the harmonic-rhythm head says 0.
Its label comes from a cosine match between the 12 pitch classes the heads
vote for (the four voices, the pitch-class set and the Roman numeral in the
tonicized key) and every chord of the vocabulary; when the chosen chord does
not exist in the tonicized key, the closest key on Weber's chart that has it is
taken. The numeral, inversion (from the predicted bass), and `/x` for
tonicizations follow. The music21 objects the Python code calls
(`RomanNumeral.pitchClasses`, `getTonicizationScaleDegree`, `weberEuclidean`)
are precomputed for every numeral and key pair into `vocabulary.json`, so the
browser needs no music21.

## From MIDI

The network was trained on scores, so a MIDI file needs two things a score has:

- **A grid.** Onsets are snapped to sixteenths and eighth-note triplets, as
  music21 does when it reads a MIDI file. Without this, notes a few ticks off
  the beat never start on a frame, the onset counters never reset, and the
  network keeps the first chord for bars (it did on BWV 846: 48 % root
  agreement with #041 before, 76 % after).
- **Spelling.** *From the keys it finds*: a first pass on music21's MIDI
  spelling (C♯ F♯ G♯, E♭ B♭), then every note spelled nearest its local key
  on the line of fifths (a minor key reaching its raised seventh), and a second
  pass. *As music21 reads MIDI* skips the second pass.

Bars come from the file's time signatures.

## Checks

- `node --test augnet/test/augnet.test.js` (4): the JS encoder gives the same
  inputs as the Python pipeline for every frame of a Bach chorale (BWV 269,
  512 frames); decoding the Keras outputs gives the same 61 chords; onnxruntime-web
  matches Keras within 2e-3 (the export itself within 6e-5). The last test needs
  onnxruntime-web: `npm i --no-save onnxruntime-web@1.30.0` or
  `ORT_WEB=…/ort.node.min.mjs`.
- `node harmony/test/bps.js --split bpstest --model augnet` scores it on the
  seven BPS-FH movements AugmentedNet held out (1, 7, 10, 14, 15, 23, 25), the
  same chord symbol recall as #041's table:

| | key | root | quality | inversion | Roman numeral* |
|---|---|---|---|---|---|
| AugmentedNet here, spelled as in the score | 80.8 | 84.0 | 80.1 | 74.2 | 52.6 |
| AugmentedNet here, spelled from its keys (as for MIDI) | 80.9 | 83.1 | 79.9 | 74.8 | 52.6 |
| AugmentedNet here, music21's MIDI spelling | 77.7 | 81.8 | 79.3 | 71.9 | 49.0 |
| AugmentedNet, as published (ChordGNN paper, table 1) | 85.0 | 84.4 | 79.0 | 73.4 | 45.4 |
| #041 harmony.js on the same 7 | 75.3 | 82.6 | 79.6 | 75.4 | 52.0 |

\*Here a Roman numeral counts as right when key, root, quality and inversion
are; the published figure compares the numeral strings, which is stricter.
The published key score is 4 points higher than ours. Both use 32nd-note
frames, but the published pipeline reads the original MusicXML scores (with
their bar lines and ties) where this one reads BPS-FH's note lists and
downbeats, and the key labels are compared differently (spelled keys there,
pitch class and mode here). Root, quality and inversion are within a point. harmony.js was tuned on five of these seven movements, which flatters it
a little.

#041 can use AugmentedNet's keys with its own chords (Keys → AugmentedNet):
Roman numerals right 55.6 % of the time on these seven movements, more than
either alone ([table](../harmony/research/01_harmony.md#5-limits-and-ideas)).

## Speed

On the page (WASM, one thread): onnxruntime-web and the model load in about 0.8 s, BWV 846 (1,984 frames) takes 43 ms in the network and 28 ms to encode
and decode, Mozart's K. 545 i (4,672 frames) 84 ms. Two passes with the key
spelling.

## The page

AugmentedNet's keys and chords (symbol and numeral) in lanes over the roll, a
strip of its frame-by-frame certainty (the lowest of the numeral, key and
chord-set heads' softmax), #041's analysis underneath with a strip that is
green where both give the same root and triad, yellow for the same root,
red where they differ. The "now" cards show both, and AugmentedNet's predicted
voicing (bass, tenor, alto, soprano). Notes are coloured by their role in
AugmentedNet's chord, or by where the two agree.

## Export

```
git clone https://github.com/napulen/AugmentedNet /tmp/AugmentedNet
uv venv -p 3.11 env && VIRTUAL_ENV=env uv pip install tensorflow==2.15.1 tf2onnx==1.16.1 onnx==1.16.2 onnxruntime "numpy<2" music21==6.7.1 pandas==1.5.3 h5py
ANET=/tmp/AugmentedNet env/bin/python augnet/tools/export_augmentednet.py
```

AugmentedNet's code needs music21 6.7 and pandas 1.x (it uses `.flat` and
`float(Series)`).
