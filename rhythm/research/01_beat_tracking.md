# Beat, tempo and rhythm detection: a brief for #040

What the problem is, the methods that work, and why #040 uses what it does.

## 1. The task

Beat tracking estimates the times a listener would tap along to music. Around it sit tempo estimation (the tapping rate in BPM), meter (beats per bar and the downbeat) and rhythm description (subdivision, swing, which instruments play where). The hard parts are well known (Gouyon & Dixon 2005; Davies et al. 2021, *Tempo, Beat and Downbeat Estimation*, ISMIR tutorial):

- **Metrical level.** Music has a pulse at several rates (eighths, quarters, half notes, bars). Listeners mostly tap near 100–120 BPM (van Noorden & Moelants 1999; Moelants & McKinney 2004) but disagree on many songs, so evaluations allow double and half tempo (AMLt, Acc2).
- **Phase.** Syncopation, off-beat bass (reggae, house) and backbeats pull trackers onto the off-beat.
- **Expressive timing and tempo change.** Classical music with rubato is the weakest genre for all systems.
- **Causality.** A real-time tracker cannot look ahead, so it must predict each beat from the past and commit before the beat arrives.

## 2. Onset detection

Beat trackers work on an onset strength signal (an onset detection function, ODF), usually at 100 frames / s.

- **Spectral flux:** the half-wave rectified frame-to-frame increase of the magnitude spectrum, summed over frequency (Masri 1996; Dixon 2006). Log compression and a log-frequency filterbank help (Böck, Krebs & Schedl 2012).
- **SuperFlux** (Böck & Widmer, DAFx 2013): compare with a frequency max-filtered earlier frame, so vibrato and glides do not count as onsets. This is one of the strongest non-learned ODFs and costs little. #040 uses it.
- **Complex domain / phase deviation** (Bello et al. 2004) finds soft onsets better but is noisier.
- **Neural onset / beat activations:** madmom's RNNs (Böck & Schedl 2011; Böck, Krebs & Widmer 2016) and TCNs (Davies & Böck 2019; Böck & Davies 2020) output a beat probability per frame and are the state of the art. They need a model in the browser (onnxruntime-web, as in #036), and most need bidirectional context. madmom's online variants use a unidirectional LSTM.

Band-wise fluxes (kick, snare, hat ranges) are also kept: they carry the rhythm pattern and the accents that mark the beat level and downbeat (Goto 2001; Klapuri, Eronen & Astola 2006).

## 3. Tempo

- **Autocorrelation** of the ODF, with a comb over the lag's multiples (Davies & Plumbley 2007; Percival & Tzanetakis 2014) and a tempo prior. Cheap, robust, and gives a whole tempo curve to display.
- **Comb filter banks** (Scheirer 1998) resonate with the ODF and give tempo and phase at once.
- **Fourier tempogram** (Grosche & Müller 2011), **predominant local pulse.**
- **Neural tempo** (Schreiber & Müller 2018; Böck, Davies & Knees 2019): best accuracy, offline.

#040 uses the ACF comb over the last 8 s, weighted by a log-Gaussian around 120 BPM, as a soft prior for the tracker.

## 4. Beat tracking

- **Agent / multiple-hypothesis trackers:** BeatRoot (Dixon 2001, 2007), IBT (Oliveira et al. 2010, causal, in Marsyas), Goto's agents (2001).
- **Dynamic programming:** Ellis 2007 (librosa's `beat_track`): offline.
- **Context-dependent tracking:** Davies & Plumbley 2007 (in Aubio and the Vamp plugins): a two-state model that switches between a general and a locked tempo. Aubio's `tempo` runs in real time and is widely used.
- **Probabilistic state spaces:** the bar-pointer model (Whiteley, Cemgil & Godsill 2006), made efficient by Krebs, Böck & Widmer (ISMIR 2015): one chain of positions per integer beat interval, tempo changes only at beat ends with probability ∝ exp(−λ |τ'/τ − 1|). madmom's `DBNBeatTrackingProcessor` decodes it with Viterbi offline. Its online mode runs the forward algorithm and is what madmom's `--online` uses with the RNN.
- **Particle filters** (Hainsworth & Macleod 2004; Cemgil & Kappen 2003; Heydari, Cwitkowitz & Duan 2021, BeatNet: a real-time CRNN with a particle filter).

#040 runs the Krebs et al. state space as a causal forward filter on SuperFlux instead of a neural activation. madmom's observation model assumes a calibrated beat probability, so #040 uses a likelihood ratio exp(β·o) (β = 5) for the raw onset strength, which penalises off-beat onsets less (+3 F on the corpus). The posterior's distance to the next beat is the prediction: the beat is emitted when due and timestamped at the prediction, which keeps the event on time despite the 21 ms analysis window.

The metrical level is chosen afterwards (level.js). The HMM prefers the fastest regular pulse a busy texture supports. A comparison of accents on even and odd pulses (as in Parncutt's pulse salience and Klapuri et al.'s tatum / tactus / measure model) halves it when the slower level is clearly marked.

## 5. Meter and downbeats

- **Bar repetition:** self-similarity of beat-synchronous features at lags of 2, 3 and 4 beats (Gouyon & Herrera 2003; Klapuri et al. 2006).
- **Downbeat cues:** harmonic change at the bar line (Goto 2001; Papadopoulos & Peeters 2011), the kick and bass (Davies & Plumbley 2006; Durand, Bello, David & Richard 2016, multi-feature CNN), and onset density.
- **Joint models:** madmom's `DBNDownBeatTrackingProcessor` (Böck, Krebs & Widmer 2016) tracks beat and bar position together on an RNN's beat / downbeat activations. Beat This! (Foscarin, Schlüter & Widmer, ISMIR 2024) is the current offline state of the art without a DBN.

#040 compares beat summaries (band accents, onset profile, chroma) 2, 3 and 4 beats apart for 3 vs 4 beats per bar, and accumulates a decaying score per bar position from the low band, the onsets, less hi-hat, and harmonic change (chroma of the two beats after against the two before, and one beat against the last). The weights were fitted with the true beats on the test corpus and the demo loops.

## 6. Swing and subdivision

The swing ratio is the long / short ratio of paired eighth notes (2 : 1 is triplet swing; jazz drummers play 1.5–3.5 depending on tempo, Friberg & Sundström 2002; Honing & de Haas 2008). #040 measures it as the position of the off-beat onset peak in a beat-normalised onset histogram (as in Gouyon, Fabig & Bonada 2003). Duple vs triple subdivision comes from the same histogram (energy at 1/2 and 1/4 against 1/3 and 2/3).

## 7. What other tools do

| Tool | Method | Real time |
|---|---|---|
| madmom | RNN / TCN activations + bar-pointer DBN | online mode with a unidirectional RNN |
| BeatNet | CRNN + particle filter | yes (≈ 20 ms frames) |
| Aubio `tempo` | spectral ODF + Davies & Plumbley's context-dependent tracker | yes, in C, ports to WASM |
| librosa `beat_track` | onset strength + Ellis DP | no |
| Essentia `RhythmExtractor2013` | multifeature (Zapata, Davies & Gómez 2014) | no; `BeatTrackerDegara` offline |
| Ableton Live warp, Rekordbox / Serato | proprietary, offline analysis of the file, then a fixed grid | grid playback only |
| DJ hardware "beat sync" from line in (Pioneer DJM, etc.) | proprietary, onset + tempo lock, typically 4–8 s to settle | yes |
| Web BPM detectors (web-audio-beat-detector, realtime-bpm-analyzer) | low-pass peak picking and interval histograms | tempo only, no phase |

## 8. Evaluation

mir_eval's beat metrics (Davies, Degara & Plumbley 2009): F-measure at ±70 ms, Cemgil, P-score, CMLt / AMLt (continuity at 17.5 % phase and tempo tolerance). Datasets: Ballroom, Hainsworth, SMC, GTZAN, RWC, Beatles (Isophonics), HJDB. None is used here: they need audio that is not redistributable. #040's corpus is rendered from MIDI and drum patterns, so beats are exact and the microphone condition can be simulated. Its numbers are not comparable with published results on real recordings.

## 9. What could improve #040

- A small causal neural beat activation (BeatNet's CRNN or a madmom-style unidirectional LSTM exported to ONNX) in place of SuperFlux. This is the main gap to the state of the art, especially for phase on syncopated music.
- Joint beat and bar tracking in one state space (beat position within a bar of 3 or 4), as madmom's downbeat DBN does, instead of a separate meter stage.
- Harmonic / percussive separation (median filtering, Fitzgerald 2010) before the chroma, so drums do not blur the harmonic change.
