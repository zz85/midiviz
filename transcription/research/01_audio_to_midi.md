# 01 — Audio → MIDI / MusicXML transcription for the browser: models, real-time options, runtimes

Research brief, 17 Oct 2026. Scope: what can turn audio (a file or a live microphone) into notes
inside a midiviz page, how good each option is, how close to real time it gets, and what it
takes to run it client-side. Companion to `fingering/research/02_algorithms.md` and
`strings/research/02_algorithms.md` (the consumers of the notes).

Tags:
- [V] = verified this session in a fetched source (paper abstract or HTML, model card, repo
  README, npm registry); [V, abstract] = only the abstract was read.
- [V, via X] = the detail comes from source X, not from the original.
- [T] = background knowledge, not checked this session.
- [?] = uncertain or not found.

Contents
1. Short answer
2. Taxonomy
3. General-purpose / multi-instrument models (Basic Pitch, MT3 family, MuScriptor)
4. Piano models (offline)
5. Streaming and low-latency piano
6. Monophonic pitch (voice, violin, winds)
7. Source separation as a front end
8. Performance MIDI → score (MusicXML)
9. MuScriptor vs Transkun
10. Browser runtimes: onnxruntime-web, Transformers.js, tfjs, ggml
11. Commercial reference points
12. Recommended plan for midiviz
13. References

---------------------------------------------------------------------------------------------

## 1. Short answer

- **Easiest today:** Spotify's Basic Pitch (`@spotify/basic-pitch`, tfjs, <17K parameters [V, via
  NeuralNote README]). Any instrument, pitch bends, tiny, Apache-2.0 [T]. Weak on dense piano and
  full mixes, no instrument labels, near-real-time at best (windowed) [T].
- **Best open multi-instrument:** MuScriptor (Kyutai + Mirelo, July 2026). 100M / 300M / 1.3B
  decoder-only transformer, Multi-F1 48.2 vs 21.9 for YourMT3+ on the authors' test set [V].
  Weights **CC BY-NC 4.0**, no velocity, 5 s chunks, autoregressive [V]. No browser build yet.
- **Best piano:** Transkun v2 (semi-CRF + non-hierarchical transformer, ISMIR 2024), claims state
  of the art on every MAESTRO subtask, MIT, outputs velocity and pedals [V]. Non-autoregressive,
  so it exports to ONNX far more easily than any seq2seq model [T].
- **Live piano:** nothing off the shelf runs under ~100 ms. Research systems: Kwon et al. 2024
  (128–320 ms), Mobile-AMT (Yamaha), Hu et al. ISMIR 2025 (strictly causal, targets <30 ms,
  code released) [V, abstract].
- **Live monophonic:** SwiftF0 (96K params, ~42× faster than CREPE on CPU) and PESTO
  (self-supervised, streaming) are small enough for an AudioWorklet [V, abstract].
- **Score:** transcription gives performance MIDI. MusicXML needs a second stage (beats,
  quantization, voices, hands, spelling): MIDI2ScoreTransformer, PM2S, ScoreTranscriber, or the
  heuristics in MuseScore (`webmscore.html` in this repo already imports MIDI and exports
  MusicXML).
- **Runtime:** Transformers.js is a layer on top of onnxruntime-web, not an alternative to it
  (v4.3.1 depends on `onnxruntime-web` 1.31.0-dev [V, npm]). For custom audio models, use
  onnxruntime-web directly with the WebGPU EP and a WASM fallback.

## 2. Taxonomy

| Family | Output stage | Examples | Browser cost |
|---|---|---|---|
| Frame / onset roll + post-processing | per-frame pitch activations, thresholds | Onsets and Frames, Basic Pitch, Kong et al., hFT-Transformer, Mobile-AMT | one forward pass per window, cheap to stream |
| Structured decoding | intervals decoded by dynamic programming | Transkun (semi-CRF) | one forward pass + Viterbi in JS |
| Seq2seq token decoding | MIDI-like tokens, autoregressive | MT3, MR-MT3, YourMT3+, Aria-AMT, MuScriptor | hundreds of decoder steps per segment, needs a KV cache |
| Monophonic F0 | one pitch per frame | CREPE, SPICE, PESTO, SwiftF0, pYIN | tiny |
| Audio → score end-to-end | notation tokens (**Kern, MusicXML-like) | piano-a2s, Rubato | seq2seq cost, research code |

## 3. General-purpose / multi-instrument models

### Basic Pitch (Spotify, ICASSP 2022)
- Lightweight CNN over a harmonic-stacked CQT, three outputs (onset, note, contour) with pitch
  bends [T]. Under 17K parameters [V, via NeuralNote README].
- `@spotify/basic-pitch` on npm runs on tfjs; latest 1.0.1, last modified Aug 2025 [V, npm].
  The Python package ships TF, CoreML, TFLite and ONNX models [V, via docsearch summary].
- Processes overlapping ~2 s windows [T], so live use means a sliding window with about a second
  of delay. No instrument identity, velocity is a rough amplitude estimate [T].
- NeuralNote v1 ran it with RTNeural (CNN) and ONNX Runtime (CQT + harmonic stacking) [V].
  NeuralNote v2 dropped it for MuScriptor [V].

### MT3 family
- MT3 (Google, ICLR 2022): T5 encoder-decoder, spectrogram → event tokens, multi-instrument [V,
  via MuScriptor wiki].
- MR-MT3 (2024): memory retention and token shuffling against instrument leakage [V, abstract].
- YourMT3+ (QMUL, 2024): PerceiverTF encoder with spectral cross-attention, mixture of experts,
  multi-channel decoder, cross-dataset stem augmentation, singing tokens [V]. Was the open state
  of the art before MuScriptor.

### MuScriptor (Kyutai + Mirelo, with IRCAM; released 9 July 2026)
- Decoder-only transformer; the mel spectrogram of a 5 s segment (16 kHz mono, n_fft 2048, hop
  160 → 100 frames/s, 512 mel bins) is projected and used as a prefix; MT3-like tokens over 36
  instrument groups (`MT3_FULL_PLUS`); greedy decoding with optional classifier-free guidance [V].
- Sizes: small ≈100M (dim 768, 14 layers), medium ≈300M (1024, 24), large ≈1.3B (1536, 48) [V].
- Training: 1.45M synthetic MIDI files rendered with 250+ soundfonts, then 170K real recordings
  (11,000+ hours), then GRPO reinforcement learning on 300 verified tracks [V, via wiki].
- Results on the authors' 372-track test set: large Multi-F1 48.2 vs YourMT3+ 21.9 (onset F1
  32.5 for YourMT3+) [V]. Scaling study (trained on real data only): small onset 51.2 / frame
  67.2 / offset 38.7 / multi 38.2; medium 52.4 / 68.0 / 40.3 / 39.7 [V].
- Limitations from the model card: **no velocity**, cannot represent two simultaneous notes of the
  same pitch and instrument, drums onset-only, weaker offsets [V]. Instrument conditioning (tell it
  which groups are present) improves results and keeps instruments consistent across chunks [V].
- Licence: code MIT, weights CC BY-NC 4.0 plus conditions (user must hold the rights to the
  music transcribed), gated on Hugging Face [V].
- Native speed (`muscriptor.cpp` on ggml, Apple M1 Pro, real-time factor, >1 is faster than real
  time) [V]:

  | Size | CPU | Metal | F16 weights | KV cache |
  |---|---|---|---|---|
  | small | 1.94× | 3.48× | 209 MB | ~218 MB |
  | medium | 0.69× | 1.56× | 618 MB | ~499 MB |
  | large | — | 0.48× | 2.74 GB | ~1.5 GB |

  Medium decode step: 13.1 ms CPU, 7.3 ms Metal; prefill of the 5 s prefix 1.71 s CPU, 0.16 s
  Metal [V]. GGUF files: `DamRsn/muscriptor-gguf` [V].
- Streaming: the Python API yields NoteStart/NoteEnd events as decoded [V], but the unit of work is
  a 5 s chunk, so live latency is at least the chunk length plus decode time [T].

## 4. Piano models (offline)

| Model | Year | Notes | Licence |
|---|---|---|---|
| Onsets and Frames | 2018 | in `@magenta/music` (tfjs), runs in a browser today; older accuracy [T] | Apache-2.0 [T] |
| Kong et al. (ByteDance) high-resolution | 2021 | regression onsets/offsets, pedals; community ONNX ports [T] | MIT [T] |
| Transkun v1 (semi-CRF) | NeurIPS 2021 | intervals scored and decoded by Viterbi, then velocity and refined onset/offset [V] | MIT [V] |
| Transkun v2 | ISMIR 2024 | encoder-only non-hierarchical transformer on a low-time-resolution feature map, inner-product interval scoring; "state of the art across all subtasks" on MAESTRO v3 [V, abstract] | MIT [V] |
| hFT-Transformer (Sony) | 2023 | hierarchical frequency-time transformer [T] | [?] |
| Aria-AMT (EleutherAI) | 2024 | seq2seq, built for robustness on real recordings; transcribed the Aria-MIDI dataset (1.19M files, ~100K hours) [V] | [?] |
| Fernandez, "onsets and velocities" | 2023 | ~3.1M params, onset F1 96.78 on MAESTRO, real-time on commodity hardware [V, abstract]; its latency is 4–9 s per Hu et al. [V] | [?] |

Transkun's pip checkpoint is trained **without** extending notes by the sustain pedal and with
augmentation; papers usually report the pedal-extended convention, so compare like with like [V].

## 5. Streaming and low-latency piano

Latency budget from Hu et al.: digital instruments want ~10 ms, networked ensemble playing
tolerates ~30 ms; earlier online systems sit at 128–320 ms [V].

- **Kwon, Jeong & Nam (2024):** acoustic CNN with FiLM, pitch-wise LSTMs, multi-state softmax
  (onset / sustain / re-onset / offset / off) with an autoregressive connection; 128–320 ms [V, via
  Hu et al.].
- **Mobile-AMT (Kusaka & Maezawa):** lightweight convolutions, augmentation for unseen recording
  conditions; online state of the art, reported 174 ms, but Hu et al. find an oversight that makes
  it 10 s [V, via Hu et al.].
- **Hu, Peter, Schlüter & Widmer (ISMIR 2025):** remove all non-causal processing from
  Mobile-AMT, share computation, vary model size, study STFT / label encoding / causal
  post-processing. Accuracy drops with strict causality and there is a preprocessing-latency vs
  accuracy trade-off. Released as a baseline [V].
- **Niikura et al. (2025):** convolutional encoder plus an autoregressive onset decoder and a
  separate offset decoder with sustain-pedal validation; streaming, comparable to or better than
  offline state of the art on MAESTRO at lower compute [V, abstract].
- **Score following:** pairing real-time transcription with symbol-level tracking (2025) [V,
  abstract], relevant if a page should follow a known score rather than transcribe blind.

## 6. Monophonic pitch

- **SwiftF0 (2025):** STFT + 2D CNN, 95,842 params, 91.80 % harmonic mean at 10 dB SNR, ~42× faster
  than CREPE on CPU [V, abstract]. ONNX available [T].
- **PESTO (2023, TISMIR 2025):** self-supervised, Siamese, VQT frames, transposition-equivariant
  objective, built for streaming [V, abstract].
- CREPE / CREPE-tiny and SPICE run on tfjs (ml5 wraps CREPE) [T]. DSP without a model: YIN /
  pYIN (`pitchy`, `pitchfinder`), aubio compiled to WASM, Essentia.js [T].
- Direct use here: microphone → F0 → notes → the #033 fingering engine.

## 7. Source separation as a front end

- HT-Demucs (4 or 6 stems, incl. piano and guitar) has ONNX exports (`demucs-onnx`) [V].
- BS-RoFormer-SW 6-stem has an ONNX build packaged for onnxruntime-web on WebGPU
  (`elicwhite/bs-roformer-sw-6stem-onnx`) [V].
- Separate, then run a piano or monophonic model on one stem: the non-NC alternative to
  MuScriptor for full mixes.

## 8. Performance MIDI → score

- **MIDI2ScoreTransformer** (Beyer & Dai, ISMIR 2024): seq2seq piano performance MIDI → score
  with compound tokens, 3.5× shorter sequences than earlier tokenizations [V, abstract].
- **ScoreTranscriber:** one transformer for quantized rhythm, performance errors and hands, a
  second for MusicXML [V].
- **PM2S** (Liu et al.): CRNN for beats, quantization, hand part, key and time signature [T].
- **Transformer rhythm quantization with beat annotations** (2026) [V, abstract]; needs a beat
  tracker (e.g. Beat This! [T]).
- **End-to-end audio → score:** piano-a2s (Zeng et al., IJCAI 2024; hierarchical bar/note decoder,
  synthetic pre-training then human recordings, **Kern output) [V]; Rubato (2026) [V, via Dual
  Evaluation]; training on fully synthesized data (2026) [V, abstract].
- **Evaluation:** "A Dual Evaluation for Music Transcription" (Aug 2026) separates notation
  similarity from playback similarity, finds CLEWS the playback metric that best matches 100+
  listeners, and finds that across 24 pipelines (8 audio→MIDI × 3 MIDI→score) the MIDI→score stage
  decides which objective a pipeline favours [V, abstract].
- **In this repo:** `webmscore.html` (libmscore WASM) imports MIDI and exports MusicXML, a working
  baseline before any ML.

## 9. MuScriptor vs Transkun

| | MuScriptor | Transkun v2 |
|---|---|---|
| Task | any instruments, full mixes, 36 instrument groups | solo piano only |
| Architecture | decoder-only transformer, audio prefix, autoregressive tokens | encoder-only transformer, interval scores, semi-CRF Viterbi |
| Output | onset, offset, pitch, instrument; **no velocity**, no pedal; drums onset-only | onset, offset, pitch, **velocity**, **sustain/soft pedal** |
| Piano accuracy | not reported on MAESTRO in the model card [?] | state of the art on MAESTRO v3 (authors) |
| Inference | 5 s chunks, hundreds of sequential decode steps, KV cache | one parallel forward pass per segment + DP decode |
| Size | 100M – 1.3B | much smaller [?]; exact count not checked |
| Speed | small 1.9× RT on M1 Pro CPU natively | not measured here [?] |
| Licence | weights CC BY-NC 4.0 (+ rights condition) | MIT |
| Browser route | port `muscriptor.cpp`/ggml to WASM (+ ggml WebGPU), or ONNX export with a custom decode loop | ONNX export, onnxruntime-web, Viterbi in JS |

For midiviz, velocity and pedal drive the synth, the key animation and the hammers, so Transkun
is the better fit for piano material. MuScriptor is the choice for anything that is not solo
piano, if the non-commercial licence is acceptable. A combined pipeline is possible: MuScriptor
for instrument assignment, Transkun for the piano part.

## 10. Browser runtimes

### onnxruntime-web
- Latest stable on npm: 1.30.0; releases roughly monthly through 2026 (1.24.2 Feb … 1.29.0 Aug)
  [V, npm].
- Execution providers: `wasm` (CPU; every ONNX operator), `webgpu`, `webgl`, `webnn`; the GPU EPs
  support a subset of operators [V, ORT docs]. Import `onnxruntime-web/webgpu` for WebGPU [V].
- The WebGPU EP has been rebuilt in C++ (shared with native ORT), which Transformers.js v4 adopted
  and tested across ~200 architectures [V, via Transformers.js v4 blog]. WebGL is the legacy path
  [T].
- WASM multithreading needs `SharedArrayBuffer`, i.e. a cross-origin-isolated page (COOP/COEP
  headers) [T]. `serve.sh` does not send them, so WASM would run single-threaded here.
- WebGPU reached about 85 % of global users by March 2026 [V, via Transformers.js docs]; Firefox
  and older Chromium may need a flag, Safari support depends on version [V].

### Transformers.js
- v4 released 9 Feb 2026; current 4.3.1, depending on `onnxruntime-web` 1.31.0-dev and
  `onnxruntime-node` 1.30.0 [V, blog + npm].
- What it adds on top of ORT: Hugging Face Hub loading and caching, tokenizers (now the
  standalone `@huggingface/tokenizers`), feature extractors (e.g. Whisper log-mel), task
  pipelines, generation loops with KV cache, quantized dtypes, `ModelRegistry` for download sizes
  and cache state [V].
- v4 changes: C++ WebGPU runtime, also in Node, Bun and Deno; exports rebuilt with ORT contrib ops
  (`GroupQueryAttention`, `MatMulNBits`, `MultiHeadAttention`, `QMoE`), ~4× faster BERT
  embeddings; esbuild, `transformers.web.js` 53 % smaller [V].
- It has no music-transcription pipeline [?, not found]. It helps only if a transcription model is
  exported in one of its supported architectures. A MuScriptor port would reuse its decoder
  machinery (KV cache, contrib attention ops) but needs custom glue for the mel prefix.
- For Basic Pitch, Transkun, Kong, SwiftF0, PESTO, Demucs: use onnxruntime-web directly.

### TensorFlow.js
- Still what `@spotify/basic-pitch` and `@magenta/music` use. Its development has slowed relative
  to ORT [T]. Switching Basic Pitch to its ONNX model would put every model on one runtime.

### ggml / llama.cpp style
- `muscriptor.cpp` runs on ggml with CPU, Metal and Vulkan backends [V]. ggml has WebGPU and WASM
  builds [T]; compiling `muscriptor.cpp` with Emscripten is the most direct path to MuScriptor in a
  browser, unverified.

## 11. Commercial reference points

Klangio Transcription Studio, Songscription (reportedly built on Beyer & Dai's model [V, via
EverybodyWiki]), AnthemScore, ScoreCloud, Melodyne, Ivory, song2notation. Pianolyze transcribes
piano entirely in the browser (MP3/WAV/FLAC/M4A → piano roll, sheet view, MIDI) [V, search
snippet]; its engine was not checked [?].

## 12. Recommended plan for midiviz

1. **Baseline page:** Basic Pitch (tfjs, or its ONNX model on onnxruntime-web) for files and a
   sliding-window microphone mode; output through the existing player and `webmscore` for
   MusicXML. Add SwiftF0 or PESTO in an AudioWorklet for live monophonic input.
2. **Piano quality:** export Transkun v2 to ONNX, run on onnxruntime-web WebGPU with WASM
   fallback, Viterbi decode in JS (or a worker). Compare against Basic Pitch on MAESTRO clips with
   `mir_eval`-style onset / offset / velocity F1, the way #031 scored against RoboPianist.
3. **Live piano:** port the Hu et al. 2025 causal baseline (or Kwon 2024) and measure
   mic → note latency end to end in an AudioWorklet.
4. **Full mixes:** MuScriptor-small via an Emscripten build of `muscriptor.cpp` if the NC licence
   is acceptable; otherwise BS-RoFormer separation + per-stem models.
5. **Score:** start with MuseScore's MIDI import; try MIDI2ScoreTransformer later and judge it with
   both notation and playback similarity, as the Dual Evaluation paper recommends.

Open checks before shipping: licences of hFT-Transformer, Aria-AMT, SwiftF0, PESTO and Kong
checkpoints; Transkun parameter count and speed; whether MuScriptor reports MAESTRO numbers in
its paper.

## 13. References

- Basic Pitch: https://github.com/spotify/basic-pitch-ts
- NeuralNote: https://github.com/DamRsn/NeuralNote
- MuScriptor: https://github.com/muscriptor/muscriptor ; https://huggingface.co/MuScriptor/muscriptor-small ;
  paper arXiv 2607.08168 ; GGUF https://huggingface.co/DamRsn/muscriptor-gguf ;
  performance https://github.com/DamRsn/muscriptor.cpp/blob/main/docs/PERFORMANCE.md
- YourMT3+: https://arxiv.org/abs/2407.04822 ; MR-MT3: https://arxiv.org/abs/2403.10024 ;
  MT3: https://arxiv.org/abs/2111.03017
- Transkun: https://github.com/Yujia-Yan/Transkun ; v2 paper https://arxiv.org/abs/2404.09466
- Aria-AMT: https://github.com/EleutherAI/aria-amt ; Aria-MIDI https://arxiv.org/abs/2504.15071
- Fernandez 2023: https://arxiv.org/abs/2303.04485
- Kwon, Jeong & Nam 2024: https://arxiv.org/abs/2404.06818
- Hu et al. 2025: https://arxiv.org/abs/2509.07586
- Niikura et al. 2025: https://arxiv.org/abs/2503.01362
- Score following 2025: https://arxiv.org/abs/2505.05078
- SwiftF0: https://arxiv.org/abs/2508.18440 ; PESTO: https://arxiv.org/abs/2508.01488
- BS-RoFormer ONNX: https://huggingface.co/elicwhite/bs-roformer-sw-6stem-onnx ; demucs-onnx: https://pypi.org/project/demucs-onnx
- MIDI2ScoreTransformer: https://arxiv.org/abs/2410.00210 ; ScoreTranscriber: https://github.com/NZX23/ScoreTranscriber
- Rhythm quantization 2026: https://arxiv.org/abs/2604.22290
- piano-a2s: https://arxiv.org/abs/2405.13527 ; synthetic A2S: https://arxiv.org/abs/2609.00640
- Dual Evaluation: https://arxiv.org/abs/2608.04511
- onnxruntime-web: https://onnxruntime.ai/docs/tutorials/web/
- Transformers.js v4: https://huggingface.co/blog/transformersjs-v4
