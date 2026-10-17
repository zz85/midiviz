# Realistic violin sound in the browser

Research brief, 17 Oct 2026. Question: how do we turn the #033 fingering/bowing output into violin audio that sounds like a player, in real time or close to it, inside a web page?

Today #033 plays through `soundfont-engine` (oxisynth) with the 8 MB Creative GM soundfont: one looped sample per note, no bowing, no vibrato, no shifts. Everything below is measured against that.

## 1. Where violin realism comes from

A violin note is not a fixed waveform. Listeners hear:

- **The bow, continuously.** Bow speed, force and contact point (sul tasto ↔ sul ponticello) shape loudness and brightness through the whole note. The Helmholtz stick-slip motion only settles after a few periods, so attacks have a scratchy pre-Helmholtz transient whose length depends on bow force.
- **Vibrato** of roughly 5–7 Hz and ±10–40 cents, starting late on long notes and absent on open strings.
- **Left-hand events:** audible portamento on shifts, finger-tap transients, the darker G string versus the brighter E string for the same pitch, ringing open strings and sympathetic resonance.
- **The body.** The bridge and wooden box filter everything through a dense set of resonances (air mode A0 near 270–280 Hz, main wood modes B1− near 450–480 Hz and B1+ near 530–560 Hz, the "bridge hill" around 2–3 kHz). A plain sawtooth through a good body response already sounds like a violin; a good string without the body does not.
- **The room** (we already have a hall reverb in `concertstage/hall-reverb.js`).

The useful consequence: most of the realism is in the **control signals** (performance), and #033 already knows the string, position, shifts, bow direction, slurs and string crossings for every note. Any synthesis method we pick should be driven by those, not by bare MIDI notes.

## 2. Options

### 2.1 Better samples (baseline, hours of work)

- **Free libraries:** VSCO 2 Community Edition and the Versilian Community Sample Library are CC0 and ship SFZ violin patches ([VSCO 2 CE](https://versilian-studios.com/vsco-community/), [VCSL](https://github.com/smpldsnds/sgossner-vcsl)); Sonatina Symphonic Orchestra has been rebuilt as SFZ ([peastman/sso](https://github.com/peastman/sso)).
- **Ceiling:** commercial libraries (Spitfire, VSL) get realism from thousands of recorded legato transitions and articulations, gigabytes we cannot ship to a browser. With free samples we get a better tone but the same static, "sampled" phrasing.
- **Fit:** good as an A/B reference and fallback. Needs an SFZ→SF2 conversion or a small sampler with velocity layers and crossfaded legato.

### 2.2 Physical modelling (real time, small, fully controllable)

- **Model:** digital waveguide bowed string (Smith; McIntyre–Schumacher–Woodhouse friction), which is what STK's `Bowed` and the Faust `physmodels` library implement ([Faust physmodels](https://faustlibraries.grame.fr/libs/physmodels/), [Michon & Smith, *Faust Physical Modeling Library*](https://ccrma.stanford.edu/~rmichon/publications/doc/IFC-18-PM.pdf)). Its inputs are exactly bow velocity, bow force, bow position and string length, so the #033 output maps onto it directly.
- **State of the art in research:** Maestre, Spa and Smith combine a waveguide string with finite-width bow hair, thermal friction and two string polarisations, and drive it with synthetic bowing gestures; radiation comes from convolving with measured body responses ([SMC 2014](https://zenodo.org/records/850848/files/smc_2014_199.pdf?download=1), [Empirical physical modeling for bowed strings](https://www.researchgate.net/publication/224150317_Empirical_physical_modeling_for_bowed_string_instruments)).
- **State of the art commercially:** Audio Modeling's SWAM Violin is waveguide-based physical modelling with continuous control of bowing, vibrato and articulation, running on one modest CPU core ([SWAM Violin](https://www.ilio.com/swam-violin)). It is the realism bar for a non-sampled, playable violin, and it proves the approach can sound convincing when the control signals are good.
- **Browser fit:** very good. Faust compiles to WebAssembly AudioWorklets (`@grame/faustwasm`); four strings with a per-sample friction solve cost well under 1 % of a core; latency is one 128-sample render quantum (2.7 ms). Double stops come free as two strings sounding at once.
- **Weak spot:** textbook waveguides sound "plasticky" without (a) a good body response and (b) humanised control curves. Body: either a measured violin bridge-to-air impulse response through a `ConvolverNode` (licence needs checking per source), or a modal filter bank built from published mode frequencies and dampings, which we can tune per instrument (violin / viola / cello).

### 2.3 DDSP: neural control of a harmonic synth (real time, small)

- **Model:** a small recurrent network maps frame-rate pitch (f0) and loudness to harmonic amplitudes and filtered noise, rendered by an additive synth and a learned reverb ([DDSP](https://magenta.withgoogle.com/ddsp), [code](https://github.com/magenta/ddsp)). The solo-violin model is trained on a few minutes of real violin, and it is the violin you hear in Google's Tone Transfer.
- **magenta.js:** ships a `ddsp_violin` checkpoint (3.9 MB) for TensorFlow.js ([checkpoint list](https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md)). Its API synthesises a whole buffer from f0/loudness arrays on the main thread, so it fits near-real-time rendering (phrase by phrase, ahead of the playhead), not a live keyboard.
- **True real time:** DDSP-VST runs the same idea as a streaming plugin, and its training notebook makes a new instrument from 10–20 minutes of monophonic audio in 2–3 hours on free Colab ([DDSP-VST](https://github.com/magenta/ddsp-vst/blob/main/docs/getting-started.md), [blog](https://magenta.tensorflow.org/ddsp-vst-blog)); framework-free C++ and PyTorch streaming ports exist ([woosukji/ddsp-realtime](https://github.com/woosukji/ddsp-realtime), [hyakuchiki/realtimeDDSP](https://github.com/hyakuchiki/realtimeDDSP)). For the browser we would export the decoder to ONNX (onnxruntime-web) or run its GRU with hand-written JS/WASM matmuls inside the AudioWorklet. TensorFlow.js cannot run inside an AudioWorklet (no WebGL/WebGPU there), so a tfjs path needs a Worker plus a SharedArrayBuffer ring buffer, which in turn needs COOP/COEP headers (plain `python3 -m http.server` does not send them).
- **Expression:** DDSP needs realistic f0 and loudness curves. MIDI-DDSP adds the missing layer: it predicts per-note vibrato, dynamics, articulation and timbre from MIDI and was trained on URMP, which includes violin ([MIDI-DDSP](https://midi-ddsp.github.io/), [paper](https://arxiv.org/abs/2112.09312)). We can either port its expression generator or write a rule-based one from #033's data (vibrato onset and depth, shift portamento, bow-change dips).
- **Weak spot:** monophonic, so double stops need two voices; timbre is good on sustained notes and weaker on fast detaché and attacks.

### 2.4 RAVE / BRAVE: neural timbre transfer (real time, audio in → audio out)

- RAVE is a streaming variational autoencoder that runs faster than real time on a laptop CPU ([RAVE](https://github.com/acids-ircam/RAVE), [streaming paper](https://arxiv.org/abs/2204.07064)). BRAVE (2025) redesigns it for interaction, with under 10 ms latency and better pitch and loudness tracking ([BRAVE](https://github.com/fcaspe/BRAVE), [paper](https://arxiv.org/abs/2503.11562)).
- Interesting as a **post-processor**: physical model or DDSP output in, a violin-trained BRAVE model out, keeping our exact control and adding recorded-violin texture. No official web runtime; it would need an ONNX export and the same Worker/ring-buffer setup as 2.3. Unverified in a browser.

### 2.5 MIDI-to-audio diffusion (highest fidelity, offline or render-ahead)

- **VIOLET** (ISMIR 2026, Aug 2026): a diffusion transformer with rectified flow that renders violin audio from MIDI notes, per-note playing techniques and a continuous dynamics curve. The authors report it beats the previous best neural violin synthesiser and approaches a top commercial virtual instrument on technique clarity, naturalness and dynamics; code and demo are public ([paper](https://arxiv.org/abs/2608.07944), [code](https://github.com/User-tian/VIOLET)).
- **ViolinDiff** (2024): two ~25 M-parameter diffusion stages, first predicting pitch-bend curves (vibrato) from MIDI, then mel spectrograms, trained on 34 h of Wohlfahrt, Kayser and Paganini recordings by 21 violinists ([paper](https://arxiv.org/abs/2409.12477)).
- **Also:** CoSaRef refines concatenative-sample output with a generative model, without needing MIDI-annotated training audio ([paper](https://arxiv.org/abs/2410.16785)).
- **Browser fit:** not real time. Plausible as "render the next phrase on WebGPU (or a local server) while the current one plays", or as an offline Render button like the #030 MP4 export. Both need an ONNX/WebGPU port we would have to build and benchmark; none of these projects ships a web runtime.
- **Why it matters:** VIOLET's inputs (notes + techniques + dynamics) are things #033 produces, so it is the best candidate for a "quality ceiling" comparison.

### 2.6 Suno-style text-to-music and open alternatives

| Model | Open | Size / speed | Follows a given score? |
|---|---|---|---|
| Suno, Udio | No, cloud API only | n/a | No: text and lyrics prompts |
| MusicGen small ([ONNX for transformers.js](https://huggingface.co/Xenova/musicgen-small)) | Yes | runs in the browser on WebGPU, slower than real time | Melody variant follows a hummed contour loosely |
| Stable Audio Open Small ([Stability/Arm](https://stability.ai/news-updates/stability-ai-and-arm-release-stable-audio-open-small-enabling-real-world-deployment-for-on-device-audio-control)) | Yes, 341 M | 11 s of audio in under 8 s on a phone | No |
| Stable Audio 3 ([paper](https://arxiv.org/abs/2605.17991)) | Small and medium open | seconds on an M4 MacBook | No (text, audio-to-audio) |
| ACE-Step ([repo](https://github.com/ace-step/ACE-Step)) | Apache-2.0, 3.5 B; v1.5 under 4 GB VRAM | fast on a GPU | No |
| Magenta RealTime ([blog](https://magenta.tensorflow.org/magenta-realtime)) | Apache-2.0, 800 M | live, needs TPU/GPU, ~3 s control latency | No (text/audio style) |
| **Magenta RealTime 2** ([blog](https://magenta.tensorflow.org/magenta-realtime-2), Jun 2026) | Open weights, 2.4 B / 230 M | 40 ms frames, ~200 ms control latency, Apple Silicon via MLX | **Takes MIDI as live conditioning** |

These models generate whole textures in a style. Apart from MRT2 none of them can play our violin line note for note, and none gives us bow, string or fingering control. MRT2 is the one to watch: a live, MIDI-steered model is close to "a neural instrument", but today it runs only on Apple Silicon through a C++/MLX engine, not in a browser, and how exactly its audio follows the MIDI notes (pitch accuracy, articulation) is something we would have to test. Realistic uses for us: accompaniment or hall ambience behind the violin, not the violin itself.

## 3. Comparison

| Approach | Latency | Download | Control from #033 | Realism (expected) | Effort |
|---|---|---|---|---|---|
| GM soundfont (today) | ~3 ms | 8 MB | notes only | low | done |
| CC0 SFZ samples | ~3 ms | 30–200 MB | notes, velocity | medium, static phrasing | low |
| Waveguide + body + performance curves | ~3 ms | < 1 MB | bow, string, shifts, vibrato | medium-high, depends on tuning | medium |
| DDSP violin (+ expression model) | 5–20 ms (worklet) / phrase (tfjs) | 4 MB | f0, loudness | high on sustained lines | medium |
| Waveguide → BRAVE | ~10–20 ms | tens of MB | full | potentially high | high, unverified |
| VIOLET / ViolinDiff | seconds per phrase | 100+ MB | notes, techniques, dynamics | highest published | high, port needed |
| Suno-style / MRT2 | 200 ms – seconds | GB | none / loose MIDI | high texture, wrong notes | not for the solo line |

## 4. Recommendation

Build one **performance renderer** and plug several synthesis back ends into it, then compare by ear.

1. **Performance renderer** (`strings/performance.js`): turns the #033 result into control curves at ~250 Hz per voice: f0 (with vibrato rate/depth/onset, shift portamento whose length depends on shift distance, no vibrato on open strings), bow velocity and force (from note length, dynamics, bow direction, slurs, bow changes, string crossings), bow position, and string index. Rules come from `01_violinist_rules.md`; later we can fit vibrato and portamento statistics to the TNUA or ViolinDiff recordings.
2. **Back end A, physical model:** Faust bowed-string waveguide per string in an AudioWorklet, a modal or convolution body per instrument, then the existing hall reverb. Cheapest, lowest latency, works with the live MIDI keyboard, and the only option that uses the string and bow data directly.
3. **Back end B, DDSP violin:** start with the magenta.js `ddsp_violin` checkpoint rendering phrases ahead of the playhead (fast to try, settles whether the timbre is worth it). If it is, move the decoder into the AudioWorklet (ONNX or hand-written GRU) for real time, and consider training viola and cello models with the DDSP-VST notebook.
4. **Reference:** a CC0 SFZ violin as the "good samples" baseline, plus an offline VIOLET render of the same excerpt as the quality ceiling.
5. **Not now:** Suno-style models for the solo line. Revisit Magenta RealTime 2 if a web runtime appears.

Open questions to answer while building: licence and availability of measured violin body impulse responses; whether a browser DDSP decoder holds up at 128-sample quanta on mid-range laptops; how much of the remaining gap to SWAM is control curves versus the string model itself.
