"""Exports AugmentedNet (Nápoles López, Gotham & Fujinaga, ISMIR 2021; v1.9,
MIT licence) for onnxruntime-web, with everything the browser needs to decode
its outputs, and a fixture for the JS tests.

  git clone https://github.com/napulen/AugmentedNet /tmp/AugmentedNet
  python -m venv env && env/bin/pip install tensorflow==2.15.1 tf2onnx==1.16.1 onnx==1.16.2 onnxruntime "numpy<2" music21 pandas
  ANET=/tmp/AugmentedNet env/bin/python augnet/tools/export_augmentednet.py

Writes
  augnet/augmentednet.onnx      the network (3 inputs x 640 frames of 32nd notes, 9 outputs, logits)
  augnet/vocabulary.json        class lists, the chord vocabulary (frompcset), and the tables the
                                decoder takes from music21: the pitch classes of each Roman
                                numeral in each key, the tonicization degree and Weber distance of
                                each pair of keys
  augnet/test/fixture.json      a Bach chorale through the Python pipeline: its notes, the encoded
                                inputs, the Keras outputs and the decoded analysis
"""
import json, os, sys
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
ANET = os.environ.get("ANET", "/tmp/AugmentedNet")
sys.path.insert(0, ANET)
import numpy as np
import tensorflow as tf
import tf2onnx, onnx, onnxruntime as ort
import music21

from AugmentedNet.feature_representation import KEYS, PCSETS, COMMON_ROMAN_NUMERALS, SPELLINGS, NOTEDURATIONS, NOTENAMES
from AugmentedNet.chord_vocabulary import frompcset
from AugmentedNet.keydistance import weberEuclidean, getTonicizationScaleDegree
from AugmentedNet.score_parser import parseScore
from AugmentedNet.input_representations import available_representations as availableInputs
from AugmentedNet.output_representations import available_representations as availableOutputs
from AugmentedNet.utils import padToSequenceLength
import types; sys.modules["mlflow"] = types.ModuleType("mlflow"); sys.modules["mlflow.tensorflow"] = types.ModuleType("mlflow.tensorflow")  # train.py imports it; inference does not use it
from AugmentedNet import inference

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..")

model = tf.keras.models.load_model(os.path.join(ANET, "AugmentedNet.hdf5"), compile=False)
inputs = [(i.name, i.shape[1], i.shape[2]) for i in model.inputs]
outputs = [o.name.split("/")[0] for o in model.outputs]
seqlen = inputs[0][1]

# ── the network ──
spec = tuple(tf.TensorSpec((None, seqlen, f), tf.float32, name=n) for n, _, f in inputs)
onx, _ = tf2onnx.convert.from_keras(model, input_signature=spec, opset=17)
# tf2onnx names the outputs after their BiasAdd ops; give them the task names
for o, name in zip(list(onx.graph.output), outputs):
    old = o.name
    for node in onx.graph.node:
        node.output[:] = [name if x == old else x for x in node.output]
        node.input[:] = [name if x == old else x for x in node.input]
    o.name = name
onnx.save(onx, os.path.join(OUT, "augmentednet.onnx"))
sess = ort.InferenceSession(os.path.join(OUT, "augmentednet.onnx"))
onnx_outputs = [o.name for o in sess.get_outputs()]
print("onnx outputs", onnx_outputs)

# ── vocabulary and the music21 tables ──
def rn_pcs(numerator, key):
    try:
        return list(music21.roman.RomanNumeral(numerator.replace("Cad", "Cad64"), key).pitchClasses)
    except Exception:
        return None

vocab = {
    "version": "AugmentedNet v1.9 (napulen/AugmentedNet, MIT)",
    "sequenceLength": seqlen,
    "frameQuarters": 4 / 32,
    "inputs": [{"name": n, "features": f} for n, _, f in inputs],
    "outputs": outputs,
    "onnxOutputs": onnx_outputs,
    "noteNames": list(NOTENAMES),
    "spellings": list(SPELLINGS),
    "keys": list(KEYS),
    "pcsets": [list(p) for p in PCSETS],
    "romanNumerals": list(COMMON_ROMAN_NUMERALS),
    "noteDurations": list(NOTEDURATIONS),
    "frompcset": {",".join(map(str, k)): v for k, v in frompcset.items()},
    "rnPcs": {rn: {k: rn_pcs(rn, k) for k in KEYS} for rn in COMMON_ROMAN_NUMERALS},
    "tonicization": {k1: {k2: getTonicizationScaleDegree(k1, k2) for k2 in KEYS} for k1 in KEYS},
    "weber": {k1: {k2: float(weberEuclidean(k1, k2)) for k2 in KEYS} for k1 in KEYS},
}
with open(os.path.join(OUT, "vocabulary.json"), "w") as f:
    json.dump(vocab, f, ensure_ascii=False, separators=(",", ":"))

# ── fixture: a Bach chorale through the Python pipeline ──
path = str(music21.corpus.getWork("bach/bwv269"))
s = music21.converter.parse(path)
notes = []
for p in s.parts:
    for n in p.flat.notes:
        for pitch in (n.pitches if n.isChord else [n.pitch]):
            tie = n.tie.type if n.tie else None
            notes.append({"on": float(n.offset), "dur": float(n.quarterLength), "name": pitch.nameWithOctave, "midi": pitch.midi, "tie": tie})
measures = [{"offset": float(m.offset), "number": m.number, "quarters": float(m.duration.quarterLength), "barQuarters": float(m.duration.quarterLength / m.barDurationProportion())} for m in s.parts[0].getElementsByClass("Measure")]
df = parseScore(path)
enc = {n.rsplit("_")[1]: availableInputs[n.rsplit("_")[1]](df).array for n, _, _ in inputs}
x = [padToSequenceLength(enc[n.rsplit("_")[1]], seqlen, value=-1).astype(np.float32) for n, _, _ in inputs]
keras = model.predict(x, verbose=0)
onnx_out = sess.run(None, {n: a for (n, _, _), a in zip(inputs, x)})
for k, a, b in zip(outputs, keras, onnx_out):
    print(f"{k}: max |keras - onnx| = {np.abs(a - b).max():.2e}")
# decoded, as inference.predict does
frames = len(df.index)
dec = {}
for name, pred in zip(outputs, keras):
    pred = pred.reshape(-1, pred.shape[2])[:frames]
    dec[name] = availableOutputs[name].decode(np.argmax(pred, axis=1).reshape(-1, 1))
chords = []
for i in range(frames):
    if dec["HarmonicRhythm7"][i] != 0:
        continue
    rn, label = inference.resolveRomanNumeralCosine(dec["Bass35"][i], dec["Tenor35"][i], dec["Alto35"][i], dec["Soprano35"][i],
                                                    dec["PitchClassSet121"][i], dec["LocalKey38"][i], dec["RomanNumeral31"][i], dec["TonicizedKey38"][i])
    chords.append({"frame": i, "offset": float(df.index[i]), "key": dec["LocalKey38"][i], "rn": rn, "label": label})
fixture = {
    "source": "music21 corpus bach/bwv269",
    "notes": notes, "measures": measures, "frames": frames,
    # inputs as the active feature indices of each frame; outputs (logits) for the first 160 frames, and the argmax of all
    "inputs": {k: [np.nonzero(row)[0].tolist() for row in v] for k, v in enc.items()},
    "outputs": {k: np.round(v.reshape(-1, v.shape[2])[:160], 4).tolist() for k, v in zip(outputs, keras)},
    "argmax": {k: np.argmax(v.reshape(-1, v.shape[2])[:frames], axis=1).tolist() for k, v in zip(outputs, keras)},
    "chords": chords,
}
os.makedirs(os.path.join(OUT, "test"), exist_ok=True)
with open(os.path.join(OUT, "test", "fixture.json"), "w") as f:
    json.dump(fixture, f, separators=(",", ":"))
print("frames", frames, "chords", len(chords), chords[:6])
