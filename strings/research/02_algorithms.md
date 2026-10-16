# 02 — Automatic fingering for bowed strings (violin / viola / cello), fretted-string transfer, and violinist motion: algorithms, data, software

Research brief, Oct 2026. Companion to `fingering/research/02_algorithms.md` (piano).

Tags:
- [V] = verified this session in a fetched source (PDF text, repo file, dataset, publisher
  page); [V, abstract] = only the abstract was readable.
- [V, via X] = the original was unobtainable; the detail comes from the fetched source X.
- [V, computed] = counted by us from the downloaded TNUA CSVs.
- [T] = background or textbook knowledge, not checked this session.
- [?] = uncertain, garbled or conflicting.

Contents
1. Taxonomy and short answer
2. Problem anatomy and state encodings
3. Rule/cost models (Sayegh, Radicioni, Maezawa, Noguchi plugin, cello DP, erhu)
4. Statistical/learned models (Nagata HMM, Sako CRF, Jen BLSTM, Cheung SSVAE, 2022–2026)
5. Guitar methods that transfer
6. Biomechanics and repertoire statistics (incl. our TNUA counts)
7. Datasets
8. Evaluation metrics
9. Motion/animation, robots, bowing physics
10. Software and notation programs
11. Comparison
12. Recommended design for our implementation
13. References

---------------------------------------------------------------------------------------------

## 1. Taxonomy and short answer

- Shortest path over (string, position, finger) with hand-set costs: Sayegh 1989 (the root),
  Radicioni et al. 2004 (guitar, phrase-segmented), Maezawa et al. 2010/12 (violin "pedagogical
  model", 17 weighted features), Noguchi's MuseScore plugin 2026 (violin/viola/cello Viterbi, ~20
  weights, open source).
- Probabilistic models trained on textbooks: Nagata, Sako & Kitamura 2014 (HMM with a skill knob)
  and Sako et al. 2015 (CRF). About 90 % concordance on beginner books and 73–76 % on intermediate
  books [V].
- Neural taggers on TNUA (10 violinists × 14 excerpts, public CSV): Jen et al. 2021 (BLSTM + rules,
  3 decoding modes) and Cheung, Kao & Su 2021 (semi-supervised VAE, joint 241-class output).
  Later work is small: YTVF, CelloFingering-8K and student transformers. I found no peer-reviewed
  transformer or LLM violin-fingering paper.
- From audio: Maezawa (timbre HMM over strings), Hirata 2022 and SyncViolinist (CRNN → string,
  position, finger, bow direction → body motion).
- Motion: audio→skeleton (Shlizerman 2018, Kao & Su 2020), via fingering/bowing (Hirata,
  SyncViolinist), diffusion with contact losses (ELGAR, cello). Bowing physics (Schelleng,
  Schoonderwaldt, Demoucron, Maestre) supplies the parameter ranges.

For us: the lattice is tiny, at most 4 strings × 5 fingers × a few hand frames, so ~10–40
candidates per note. What matters is a short list of costs (shift, open string vs 4th finger,
crossing, same finger, position preference, extension, timbre continuity) made time-aware. A
first-order Viterbi with hand frame in the state (§12) is the right core. Tune it on TNUA and
test it on textbook scales. The human ceiling is high: violinists agree on (string, position,
finger) for 91.3 % of TNUA notes [V, computed].

---------------------------------------------------------------------------------------------

## 2. Problem anatomy and state encodings

- Each pitch has 1–4 (string, finger) realisations. The open strings G3 D4 A4 E5 (MIDI
  55/62/69/76) add a zero-finger option with a different timbre and no vibrato [V, Nagata §2.3;
  Cheung §1].
- The hand frame matters more than the finger. Four fingers span about a perfect fourth on one
  string, and moving the frame (a shift) is the costly, audible event. A string crossing is
  cheap for the left hand but is a bow event [T].

| Source | "Position" encoding |
|---|---|
| Maezawa 2012 | semitones of finger 1 above the nut (1st pos = 2, 3rd = 5) [V] |
| Nagata 2014 | index-finger fret on a virtual 24-fret neck, plus finger intervals (whole/half between neighbours, 2³ combos) [V] |
| TNUA / Jen 2021 | 1–12 = diatonic letter step of finger 1. Index pitch per position: G [55,57,59,60,62,64,65,67,…], D [62,64,65,67,69,…], A [69,71,72,74,76,…], E [76,78,79,81,83,…] [V, model code] |
| SyncViolinist | 12 positions + none; string 4 + none; finger open/1–4 + none [V] |
| CelloFingering-8K | 0.5 = half position …; from 8, thumb region in semitone steps; finger 0–4, T [V] |
| Noguchi plugin | violin/viola: the 4 fingers play 4 consecutive scale tones of the key in each (string, position), accidentals shift a finger a semitone; cello: chromatic frame [V] |

- Empirical finger offsets in TNUA, in semitones above the open string, most frequent first
  [V, computed]:
  - pos 1: f1 2 (1), f2 3/4, f3 5 (6), f4 7
  - pos 3: 5 (6) / 7 / 9–8 / 10 (11)
  - pos 5: 9–8 / 11–10 / 12 / 14–13
  - So within a frame f2 sits 1–2 semitones above f1, f3 sits 3–4 above f1, and f4 sits 5 above
    f1 (6 when extended).
- Cello [T]: chromatic closed frame (1-2-3-4 on consecutive semitones); extended frame with a
  whole tone between 1 and 2; thumb position above about the octave.

---------------------------------------------------------------------------------------------

## 3. Rule / cost-based models

### 3.1 Sayegh (1989), "Fingering for string instruments with the optimum path paradigm"
Computer Music Journal 13(3):76–84. I could not fetch it (JSTOR). As described by fetched papers:
- Layered graph with nodes = (string, fret/position[, finger]) realisations of each note, edges =
  transition costs; the fingering is the minimum-cost path, which is DP for a deterministic system
  [V, via Radisavljevic & Driessen 2004; Radicioni 2004].
- Costs are "the distance that the hand traverses horizontally and vertically", i.e. position
  and string changes [V, via Maezawa 2012], optimised globally over the piece [V, via Hori &
  Sagayama 2017].
- It includes expert rules such as "matching the acoustical quality of all vibrating strings"
  (timbre continuity) [V, via Radisavljevic 2004].
- Exact weights not obtained [?]. Every later string DP refines this graph.

### 3.2 Radicioni, Anselma & Lombardo (2004), CIM04 Graz [V, PDF]
"A segmentation-based prototype to compute string instruments fingering". The instrument is
the classical guitar (the output drives a guitar physical model).
- State: ⟨string I–VI, fret 0–17, finger 1–4⟩ per note, solved as a layered DAG shortest path
  in linear time. The search space is 4ⁿ fingerings, up to 16ⁿ with strings.
- Edge cost = ALONG + ACROSS.
  - ALONG: per finger pair a comfortable, minimum and maximum span in frets (adult male). Zero
    cost within comfortable, increasing toward min/max; beyond them a penalised hand
    repositioning (Heijink & Meulenbroek 2002). MaxSpan (frets): index–middle 2, index–ring 3,
    index–little 3, middle–little 2, ring–little 1 (middle–ring "0" looks like a typo [?]).
  - ACROSS: finger replacement, unnatural postures, keeping the vertical span compact.
- Contribution: phrases are annotated by hand and solved separately, then chained (last vertex
  of A → first of B).
- Test: Molino Rondò op. 6/2, phrase A (38 notes), against one professional guitarist. With
  phrasing: 2 finger swaps. Without: 7 finger swaps + 2 wrong positions. All errors fell at
  phrase boundaries. A position (string, fret) miss counts worse than a finger miss.
- Follow-ups: ICMC 2005 "Guitar fingering for music performance"; a CSP virtual guitarist (LNCS
  2005); Constraints 2007, DOI 10.1007/s10601-007-9015-y [V, abstracts]. The thesis
  "Computational modeling of fingering…" was not found online [?].

### 3.3 Maezawa, Itoyama, (Takahashi,) Komatani, Ogata & Okuno (2010, 2012)
IEA/AIE 2010, LNCS 6098:249–259, reports the bowed-string estimator going from 38 % to 59 % in
realistic conditions [V, abstract]. The full version is CMJ 36(3):57–72, 2012, DOI
10.1162/COMJ_a_00129; details below are from its PDF [V].

Audio → bowed string:
- Features: 10 harmonic strengths found by EM under a score-informed comb mask (chroma-DTW
  alignment to the MIDI), then DCT(log). A GMM per (string, pitch) scores each string, with
  mean normalisation for a different instrument.
- String HMM: p(s_i | s_j) ∝ exp(−v((Δp/7)² + Δs²)) with v = 30. The 7 encodes that intervals up
  to 7 semitones stay on one string and larger ones cross.
- Prior p(s | pitch) ∝ exp(−(pitch − open(s))/β), β = 0.1: favour the lowest fingerboard location.
- Training: 24 min of chromatic scales on an electric violin. Tests used new strings and another
  violin.

Ergonomic fingering given the strings. Note = (pitch, string 1..4 low→high, finger 0..4, position
in semitones); minimise ΣC_b(s_i, s_{i−1}) by Viterbi; τ_p = 3. Finger-pair matrices (rows and
columns = open, f1..f4, in semitones):

    Pmax = [0 0 0 0 0; 0 0 2 4 6; 0 2 0 2 5; 0 4 2 0 3; 0 6 5 3 0]
    Pnat = [0 0 0 0 0; 0 0 2 3 5; 0 2 0 1 2; 0 3 1 0 2; 0 5 2 2 0]
    (Pmin garbled in the PDF text [?])

| Feature (two-note) | Meaning | Weight |
|---|---|---|
| HVM x1 | ∞ if the note cannot be played on that string | hard |
| HVM x2, x3 | \|Δposition\|, \|Δposition\|² (both stopped) | 0.5, 1 |
| HVM x4 | same finger with a position change (glissando) | 1 |
| HVM x5, x6 | \|Δstring\|, Δstring² (both stopped) | 5, 1 |
| HVM x7 | finger distance ≠ Pnat (unnatural frame) | 0.5 |
| HVM x8 | finger order against pitch direction with \|Δp\| < τ_p | 20 |
| HVM x9 | unnecessary position change around an open string | 10 |
| VPM x1 | same finger, different pitch, no real shift | 1 |
| VPM x2 | chromatic step with a non-adjacent finger (wrist move) | 10 |
| VPM x3 | small shift with Δpr·Δf = −1 ("crawl" from a higher to a lower finger) | −0.5 (bonus) |
| VPM x4 | 4th finger twice in a row on different notes | 10 |
| VPM x5 | position height | 1.1 |
| VPM x6, x7 | 1st position, 3rd position | −0.3, −0.2 (bonus) |
| VPM x8 | half position | 0.2 |

W_BN = [1, 0.5, 1, 1, 5, 1, 0.5, 20, 10] and W_BV = [1, 10, −0.5, 10, 1.1, −0.3, −0.2, 0.2] as
printed; C_b = W·x; tuned by hand because "the corpus is too small" [V]. The VPM features come
from Yampolsky and Flesch.

Evaluation: 10 excerpts (~200 notes), 7 violinists, 66 answers. Preferred HVM-2 alone 5 times,
HVM+VPM 54 times, no preference 7 (sign test p = 0.01). The authors credit mainly the 1st/3rd
position preference. Recovering Joachim's 1903 Romanze fingering partly failed: gut E string,
~5 kHz band limit, and vibrato on notes the model played open.

### 3.4 Noguchi, "ViolinFingering" MuseScore 4 plugin (2026, GPL-3.0) [V, code + README]
https://github.com/knoguchi/violin-fingering. This is the most complete open cost model. Ideas
only, since the licence is GPL.
- Viterbi over (string, finger, position + accidental offset); candidates come from the key
  layout.
- Chords are joint frames on contiguous strings; double stops may span 2 positions (tenths).
- Harmonics split segments; existing finger and string marks are constraints, and string marks
  are "sticky".

| Term (violin `DEFAULT_COST`) | Value |
|---|---|
| shift | 2.5 + 3.0 × \|Δposition\| |
| shift while an open string sounds | × 0.5 |
| crossing by string distance 0/1/2/3 | 0 / 0.5 / 2.5 / 5.0 |
| same finger to another string | 1.5; perfect fifth "barre" 0.1 |
| same finger semitone slide | 0.5 |
| stretch beyond frame (2 semitones per finger step) | 0.4 per semitone |
| open string G / D / A / E | 0.25 / 0.3 / 0.4 / 0.65 |
| accidental displacement; spelling tie-break | 0.6; 0.05 |
| position cost by index | [0, 0, 0.15, 0.06, 0.11, 0.10, 0.20, 0.16] (I, III home), then +0.1 each |
| high position on a lower string | 0.03 per position per string below E |
| chord position spread; span | 0.5 per position; ≤ 1 (3–4 notes), ≤ 2 (pairs) |

Cello overrides: finger costs [0, 0, 0.5, 1.0, 0.5], a scale key map, and a two-pass thumb
decision. The author reports 90 % agreement with a cellist's scales and about 60 % with 86 sparse
Bach marks. Stated gaps: durations, rests and slurs are ignored ("a shift before a whole note is
priced like a shift mid-run"), trills are unseen, and there is no timbre model.

### 3.5 Others
- Cello DP (J. Lee, student journal paper) [V]: DP(n, f) = min_g DP(n+1, g) + cost(n, f, n+1, g);
  fingers 1–4; positions ½–4 in half steps; 12 hand-made shift tables (up/down per position ×
  finger pair × half steps).
- Erhu (Su & Wang, Soft Computing 28:8279, 2024) [V, abstract]: a rule-based quantitative
  evaluation system plus off-policy TD-RL generation; ~90 % score, within 3 % of professional
  fingerings.

---------------------------------------------------------------------------------------------

## 4. Statistical and learned models

### 4.1 Nagata, Sako & Kitamura (2014), ICMC|SMC pp. 1233–1238, CC BY 3.0 [V, PDF]
"Violin fingering estimation according to skill level based on HMM". The authors are at the
Nagoya Institute of Technology, not Kameoka/Sagayama. Predecessor: IEEJ Trans. EIS 134(4), 2014.

Model:
- Hidden state: {string (E = 1 … G = 4), finger 0–4, hand position HP = index fret, finger
  intervals FI ∈ 2³}.
- Observation: {pitch, note length l, rest length r}.
- Expressiveness e = w_l·log(1 + l), where w_l is the skill knob. Changeableness c = l + w_r·r,
  w_r = 4.
- Transition depends on the observation: a_ij ∝ P_SN·P_FN·P_HP·P_FI.
  - P_SN = Laplace(prev string, k₁c).
  - P_FN = finger prior.
  - P_HP = Laplace(prev HP, k₂c)^{w_HP}·prior^{1−w_HP}, with k₂ larger after an open string.
  - P_FI = 1/8 if HP changes, else Exp(M/k₃c)^{w_FI}·prior^{1−w_FI}, M = summed finger movement.
- Output = 1[pitch] × P(e | string)P(e | finger), log-normal. High skill avoids open strings on
  long notes (vibrato).

Training and results:
- Train: 17 pieces / 4,852 notes from intermediate textbooks. Test: beginner (14 / 2,265) and
  intermediate (14 / 5,086). Grid search: w_HP = 0.6, w_FI = 0.1.
- Concordance (string and finger both match): beginner peak at w_l = 0.2, ~90 %+ (plotted on an
  80–95 % axis); intermediate peak at w_l = 1.5 (73–76 % axis). The two settings differ on 720
  notes (14 %).
- Seven violinists rated w_l = 0.2 easier and 1.5 more expressive; the beginner output was as good
  as or better than the textbooks. Main failure: the same finger on consecutive different pitches.

Sako, Nagata & Kitamura 2015 (HCII, LNCS pp. 485–494) do the same with a CRF [V, via Cheung refs].

### 4.2 Jen, Chen, Sun & Su (2021), IUI pp. 208–212, DOI 10.1145/3397481.3450661 [V, abstract + code]
- Introduces TNUA (§7.1). A BLSTM over (pitch, onset, duration, beat type) gives string and
  position probabilities.
- Rules finish the job: pitch masks; finger = f(pitch − index pitch of (string, position));
  `avoid_same_finger` rewrites a third consecutive same finger on different pitches.
- Position decoders (code): basic = argmax; nearest = closest to the previous position among
  the top 3; lowest = lowest of the top 3.
- User study: no single output meets all requirements, so offer multiple paths with a human in
  the loop.
- GUI (IEEE AIVR 2021, ieeexplore 9644347): MusicXML, the 3 modes, user constraints, PDF/MusicXML
  export via music21 + MuseScore 3.

### 4.3 Cheung, Kao & Su (2021), ISMIR pp. 113–120, CC BY 4.0 [V, PDF]
Code: https://github.com/vkmcheung/violin-ssvae (Keras + windowed TNUA pickles).
- Motivation: 85 % of 23,142 IMSLP violin scores (sampled every 400th) carry no fingering.
- Model: M2-style semi-supervised VAE.
  - Embeddings (MIDI 16, onset 8, duration 4) → dense 64.
  - Encoder BLSTM 64×2 → z (16-D).
  - Classifier BLSTM 128×2 → softmax over 241 joint classes (string × position 1–12 × finger 0–4).
  - Decoder reconstructs pitch, onset and duration.
  - Gumbel-softmax τ = 0.75, β = 0.001; windows of 32 (hop 16); leave-one-out; violinist #2 only.
- Fully supervised MRR: string 0.873, position 0.715, finger 0.721.
- Biases: toward 1st/3rd position; notes played open were predicted as finger 2 or 4 in 32 % of
  cases (the reverse only 3.5 %/6.5 %); 11th–12th-position notes came out an octave low.

| Salut d'amour (MRR / macro-F1) | String | Position | Finger |
|---|---|---|---|
| SSVAE 1 labelled + 6 unlabelled | .563 / .291 | .448 / .120 | .481 / .147 |
| SSVAE 7L + 6U | .903 / .834 | .716 / .214 | .758 / .500 |
| SSVAE 13L supervised | .906 / .830 | .726 / .305 | .776 / .636 |
| Jen 2021, 13L | .913 / .667 | .729 / .241 | – / .412 |

Semi-supervision gives about +11 % string MRR/nDCG at a 1:6 ratio. Position F1 stays at 0.2–0.3,
far below the 92 % inter-violinist position agreement (§6.3).

### 4.4 2022–2026
- YTVF (Su lab, github wayonbvc/…Audio-Symbolic-Fusion): 30 YouTube performances annotated by eye
  (string, position, finger, bowing, harmonic) and an audio+score fusion model that personalises
  fingering to a recording. No paper or licence found [V, README].
- CelloFingering-8K (github UiinKim, 2026): 9 works, 39 excerpts, 8,161 notes, string C/G/D/A,
  position, finger 0–4/T, plus thumb/harmonic/double-stop/grace columns. Compares raw prediction,
  physical masking and constrained decoding (feasibility + transition costs) under
  leave-one-piece-out × 5 seeds. Licence "Other" [V].
- Student/hobby work: a UMD transformer + LoRA project (MIT; "data is the bottleneck"), cellogpt
  (seq2seq, MIT), Dyna-Q browser generators (MIT) [V, READMEs].
- Audio side: SyncViolinist (§9); VioPTT technique-aware transcription (arXiv 2509.23759).
  ViolinDiff (ICASSP 2025, arXiv 2409.12477) and VIOLET (arXiv 2608.07944) are synthesis models,
  not fingering [V, abstracts].
- Not found despite searching [?]: "FiddleFingers", a "sight-reading" fingering paper, any
  LLM-based violin fingering, a "Lin et al." score→bowing+fingering model, and any peer-reviewed
  symbolic violin transformer.

---------------------------------------------------------------------------------------------

## 5. Guitar methods that transfer

| Work | Method | Numbers | Use for us |
|---|---|---|---|
| Radisavljevic & Driessen, ICMC 2004 [V, PDF] | Stage = any note on/off. State = (string, fret, finger) matrix on a 6×17 grid. Backward DP J_k(i) = C_s(i) + min_j[C_t(i,j) + J_{k+1}(j)]. Linear features: frets between fingers, mean fret, open strings, frets each finger travels. "Path difference learning": gradient steps (0.003) until the tablature path beats the optimum, E = Σ(P_d/P_a − 1) | 7 pieces, pooled 747 stages: 91 → 33 errors (12.2 % → 4.4 %) | fit our weights on TNUA |
| Tuohy & Potter, ICMC 2005; Tuohy thesis 2006 [V, thesis] | GA (population 300, crossover 0.6, mutation 0.07) + ANN for finger. 14 factors: fretted-note count, open-string reward, fret distance between chords, chord span, largest jump, 4 "hold the hand still" factors, higher-note-on-higher-string, slight high-fret penalty. Weights by meta-GA. Rejects per-finger-distance costs | – | hand-hold reward as a shift prior |
| Heijink & Meulenbroek 2002, J. Motor Behav. 34(4) [V, PDF] | 6 professional guitarists, 3-D mocap. Complexity = neck position, repositioning, finger span; lowest in mid-neck; joints kept mid-range | – | span and shift as the main costs |
| Hori, Kameoka & Sagayama 2013/14 [V, PDF] | HMM hidden = hand form. a_ij(dt) ∝ (1/2dt)e^{−\|I_i − I_j\|/dt}·1/(1+I_j)·1/(1+W_j)·1/(1+N_j), with index fret I, span W, number of fingers N | – | the dt scaling = time awareness |
| Hori & Sagayama, ISMIR 2016 / SMC 2017 [V] | Minimax and Lp-Viterbi: minimise the worst move (p = ∞) or interpolate | – | "no awful shift" option |
| Kehling et al., DAFx 2014 [V, abstract] | Audio → string/fret, plucking style 93 %, expression 83 % | – | – |
| Edwards, Riley, Sarmento & Dixon, ISMIR 2024 (arXiv 2408.05024) [V] | Masked-LM transformer assigns strings; pretrained on DadaGP (26,181 songs); playability user study | beats DP baselines in ratings | – |
| Fretting-Transformer (Hamberger et al., arXiv 2506.14223) [V] | T5 MIDI → tab, tuning/capo conditioning, plus validity post-processing | Leduc: tab acc. 68.6 % → 72.2 %; pitch acc. 97.2 % → 100 %; beats A* and Guitar Pro | post-hoc validity repair |

Transfers: the DP/HMM machinery, learning weights from paths, span and frame costs, the 1/dt
time scaling, minimax decoding, and validity masks. Does not transfer: chord shapes (violin
double stops need adjacent strings), fret-span tables (unfretted, different scale), and the
weak role of timbre (on violin it drives string choice).

---------------------------------------------------------------------------------------------

## 6. Biomechanics and repertoire statistics

### 6.1 Shifting: Visentin, Li, Tardif & Shan (2015), PeerJ 3:e1299 [V]
- 6 professional violinists, 540 shifts in Kreutzer Étude 11. All shifts span 2 positions (a
  third, the most common size). 200 fps mocap; tempi 60/72/100 bpm.
- Duration of shift (initiation → arrival pitch sounds): 294–461 ms per subject mean, nearly
  independent of tempo (≤ 25 ms variation). The arrival sits 27–68 ms (± 20–67) off the beat.
- Initiators: shorter players (≤ 1.60 m) lead with the thumb (87 % down, 72 % up). Taller players
  use the thumb for 93 % of down-shifts and the wrist for 83 % of up-shifts.

### 6.2 Bimanual timing
- Baader, Kazennikov & Wiesendanger 2005 (Cogn. Brain Res.) [V]: finger–bow synchrony varies
  −12…+60 ms, unnoticed by listeners. Fingering is serial plus anticipatory: descending on one
  string, the next lower finger is placed before the current note ends.
- Kazennikov & Wiesendanger 2009 [V, abstract]: up to ~100 ms is tolerated; shifts and string
  changes run in parallel with bow–finger coordination.
- Schoonderwaldt & Altenmüller 2014 (PLoS ONE) [V]: 22 violinists; bow inclination (string
  crossing) leads bow velocity (bow change) by ~15° of phase.

### 6.3 TNUA statistics (our counts) [V, computed]
All 140 CSVs, 108,795 note rows, MIDI 55–100. Cheung quotes 217,690 annotations, about 2× our
count [?].

| Statistic | Value |
|---|---|
| Positions 1st / 3rd / 2nd / 4th / 5th / 6th / ≥7th | 55.6 / 23.7 / 8.0 / 6.2 / 4.5 / 1.1 / 0.8 % (no half, no 10th) |
| Strings E / A / D / G | 30.0 / 37.0 / 24.0 / 8.9 % |
| Fingers 0 / 1 / 2 / 3 / 4 | 10.2 / 25.6 / 27.5 / 24.2 / 12.5 % |
| Open use when available (D4, A4, E5), by note value | whole 0 % (n = 50), half 26 %, quarter 16 %, 8th 52 %, 16th 65 %, 32nd 49 % |
| Position change between consecutive stopped notes | 8.6 % of transitions; sizes 1: 4,506, 2: 3,667, 3: 804, 4: 175, 5: 92, ≥6: 88 |
| Same finger, consecutive different pitches | 5.1 % (mostly shift arrivals) |
| String crossings: none / adjacent / skip 1 / skip 2 | 69 / 29 / 1.4 / 0.4 % |
| Pairwise inter-violinist agreement (8 aligned excerpts, 330,930 pairs): string / position / finger / all | .970 / .922 / .919 / .913 |

Long notes are stopped and short ones go open: Nagata's expressiveness term, measured.
Violinists agree far more than PIG pianists (M_gen 71 %), so a good model should exceed 80 %
on TNUA.

---------------------------------------------------------------------------------------------

## 7. Datasets

### 7.1 TNUA violin fingering dataset (Jen et al. 2021) [V]
https://github.com/Tsung-Ping/Violin-Fingering-Generation → `TNUA_violin_fingering_dataset/`
- 10 pieces in 14 excerpts, each annotated by 10 professionals: Bach BWV 1004 Allemanda and
  BWV 1006 Preludio; Mozart K. 216 i and iii (2 parts); Beethoven op. 24 i and op. 30/1 iii
  (2 parts); Elgar Salut d'amour; Mendelssohn op. 64 i (3 parts); two Teng Yu-hsien Taiwanese
  songs.
- Files `vio{1..10}_{piece}.csv` with columns `pitch,start,duration,beat_type,string,position,finger`:
  - pitch: MIDI 55–100.
  - start: beats within the bar (negative = pickup); duration in beats.
  - beat_type: 0–6 = N/A, whole … 32nd.
  - string: 1–4 = G, D, A, E (0 = none).
  - position: 1–12.
  - finger: 0–4.
  - Example: `80,0.0,1.0,3,3,3,4` = G#5, A string, 3rd position, 4th finger.
- 6 excerpts differ by 1–3 notes between violinists, so align before comparing.
- Licence: none (no LICENSE file; the API reports null). Default copyright applies [T], so keep
  it local, cite it, and do not commit it.

### 7.2 Other data

| Set | Content | Size | Access |
|---|---|---|---|
| YTVF | YouTube, fingering + bowing by eye | 30 performances | GitHub, no licence [V] |
| CelloFingering-8K | cello string/position/finger/thumb | 8,161 notes | GitHub, "Other" [V] |
| Nagata textbooks | violin textbooks | ~12 k notes | not released [V] |
| SyncViolinist | audio + 75-joint marker mocap + bowing/fingering labels (professional) | 3.1 h, 61 pieces | github Kakanat/SyncViolinist [V] |
| MOSA (Huang et al., TASLP 2024) | 120 fps mocap, 34 markers incl. violin/bow (VIVT/VIVB/VIBT/VIBB); note, beat, harmony, dynamics, articulation annotations; piano + violin | 742 performances, 23 musicians, 30.7 h, 570 k notes | Zenodo 10.5281/zenodo.11393449, restricted [V] |
| Kao & Su 2020 | 3-D 15-joint pseudo-labels, several violinists per piece | 14 pieces | GitHub (one fold) [V] |
| Shlizerman 2018 | YouTube recitals, 2-D OpenPose | 3.6 h violin | code on GitHub [V] |
| URMP (Li et al., TMM 2019) | 44 chamber pieces, MIDI + separate audio + video | 44 | registration [V] |
| Volpe et al.; SPD (Jin et al. 2024) | mocap of body/instrument/bow; violin + cello, 140 joints | 2.4 h / 3.0 h | [V, via SyncViolinist Table 1] |
| VioPose (UMD) | calibrated video + audio + 3-D mocap | "largest" | sj-yoo.info/viopose [V, abstract] |

---------------------------------------------------------------------------------------------

## 8. Evaluation metrics

| Metric | Used by | Note |
|---|---|---|
| Concordance (string and finger) | Nagata | vs. one textbook |
| Errors per stage | Radisavljevic | optimum ≠ tablature |
| Position miss > finger miss | Radicioni | position = (string, fret) |
| Precision/recall/F1 per label | Jen (micro), Cheung (weighted; macro on Salut) | string, position, finger separately |
| MRR; nDCG@1/@3 | Cheung | nDCG relevance = fraction of the 10 violinists choosing a label |
| Accuracy from audio | Hirata / SyncViolinist | string .965/.942, finger .879/.664, position .892/.759, bow direction .820/.724 |
| Preference tests | Maezawa (sign test), Nagata (5-point scales) | – |
| Pitch acc. vs tab acc. | Fretting-Transformer | validity vs agreement |
| Motion: onset F at 33/67/100 ms; finger-contact and bow–string distance | Hirata (0.582/0.867/0.913), ELGAR | – |

Missing, and worth adding: PIG-style multi-reference metrics (M_gen/M_high/M_soft over the 10
TNUA violinists) and fluency counts (shifts per note, same-finger repeats, skip crossings).

---------------------------------------------------------------------------------------------

## 9. Motion, robots, bowing physics

### 9.1 Score/audio → violinist motion

| Work | Pipeline | Note |
|---|---|---|
| Shlizerman et al., CVPR 2018 "Audio to body dynamics" [V] | MFCC (24 fps) → LSTM → 2-D keypoints → rigged avatar | 3.6 h of recitals |
| Kao & Su, ACM MM 2020 (DOI 10.1145/3394171.3413848) [V] | audio → 3-D 15-joint skeleton; encoder-decoder + self-attention; beat-guided; "bowing attack" (bow-change timing) emphasised | several violinists per piece |
| Hirata, Tanaka, Hamanaka & Morishima, SIGGRAPH 2022 poster (after Bowing-Net 2021) [V] | audio → string/finger/position/bow direction → left/right hand synthesiser + body model | preferred by 30 raters |
| SyncViolinist (Nishizawa … Morishima), arXiv 2412.08343 [V] | mel → 4 CRNNs (bow 3, string 5, finger 6, position 13 classes) → 75 joints → SMPL-X via VPoser. Violin follows the neck and aims at the left thumb's first joint; bow follows the right ring finger | 3.1 h dataset |
| ELGAR, SIGGRAPH 2025, arXiv 2505.04203 [V] | diffusion, whole-body cello from audio; hand and bow contact losses | SPD-GEN |
| VioPose, arXiv 2411.13607 [V] | 2-D video + audio → 4-D pose, down to vibrato | – |
| MusicSynth, arXiv 2605.17181 [V] | OMR → first-position lookup → 2-D fingerboard video | no optimisation |

The trend is to make (string, position, finger, bow direction) explicit and then synthesise
motion. That is our route, except we compute fingering from the score.

### 9.2 Robots
- Toyota violin robot (6 Dec 2007): 152 cm, 17 joints in arms and hands; played at Expo 2010
  [V, press release].
- Shibuya (Ryukoku) [V]: a 7-DOF right arm (2011). Horigome & Shibuya 2024, Front. Robot. AI
  11:1439629: a dual 7-DOF robot; Q-learning + ε-greedy + NN chooses bow speed and direction to
  hit target sound pressure.
- Ghost Play (NIME 2022): linear actuators for bow speed, pressure and pitch [V, abstract].
- Kajitani's MUBOT: ACRA 1999 survey [V, title only]. No "ViolinBot" by Jin et al. found [?];
  Jin et al. 2024 is the SPD mocap dataset.

### 9.3 Bowing physics and parameters
- Schelleng bounds for Helmholtz motion. Symbols: β = relative bow–bridge distance, v_B = bow
  velocity, Z = string impedance, μ_s/μ_d = static/dynamic friction.
  - F_max = Z·v_B/(β(μ_s − μ_d)). Askenfelt 1989 adds a factor of 2; Schoonderwaldt et al. 2008
    use the asymptotic μ'_d [V, Mores DAGA 2016].
  - F_min ∝ Z²v_B/(2β²R(μ_s − μ_d)) [T]. Measured lower limits did not scale with v_B over
    5–20 cm/s and were ~10× Schelleng's value [V, Schoonderwaldt 2009].
- Typical violin values [V, Schoonderwaldt PhD 2009]:

| Parameter | Range |
|---|---|
| bow velocity | 5–100 cm/s |
| bow–bridge distance | 5–60 mm (β from 1/30 ≈ 11 mm to 1/6 ≈ 55 mm) |
| bow force | 0.1–2 N |
| bow position | 0–65 cm from the frog |
| skewness | ±10° |
| inclination | ~65° from G to E (≈ 21.7° per string step, our division) |
| tilt | toward the fingerboard |

  Near the upper force limit the pitch flattens by up to 26 cents (5 cm/s) or 77 cents
  (20 cm/s). Force mostly sets brightness.
- Measurement and control models:
  - Demoucron PhD 2008 and Schoonderwaldt & Demoucron (JASA 2009): sensor bow + mocap measuring
    position, velocity, force, β, skewness, inclination and tilt [V, abstracts].
  - Demoucron, "Violinist's bestiary" (2010): sautillé and martelé as analytic curves with few
    parameters [V].
  - Maestre et al., ICMC 2009: bow velocity, force and β per note as cubic Bézier segment
    sequences, one model per class (articulation × dynamics × bow direction × bow and phrase
    context) [V].
  - Maestre, Pérez & Ramírez, ICMC 2010: concatenative "gesture sampling" of bowing parameters
    by score context, driving a waveguide model [V].

---------------------------------------------------------------------------------------------

## 10. Software and notation programs

| Tool | What | Licence |
|---|---|---|
| knoguchi/violin-fingering (MuseScore 4.4+) | cost Viterbi (§3.4); writes finger numbers, positions and string numbers | GPL-3.0 [V] |
| Tsung-Ping/Violin-Fingering-Generation | BLSTM + rules, 3 modes, tkinter GUI | none [V] |
| vkmcheung/violin-ssvae | SSVAE | none [V] |
| DIY23/FiddleTabs (MuseScore 4) | colour-coded string/finger labels (0, 1L, 1, 2L, 2, 3, 3H, 4); appears to be a lookup [?] | GPL-3.0 [V] |
| osteele/fingerboard | scale fingerings for violin, viola and cello | MIT [V] |
| music21 | representation only: `Fingering`, `StringIndication`, `FretIndication`, `UpBow`/`DownBow`, `StringHarmonic` | BSD [V source; T licence] |
| Guitar Pro / MuseScore tab | automatic guitar tablature | [V, via Fretting-Transformer; T] |
| MuseScore, Dorico, Sibelius, Finale | no built-in automatic string fingering as far as I know; fingering is a manual symbol | [T] |

---------------------------------------------------------------------------------------------

## 11. Comparison

| Approach | Data | Time-aware | Timbre / open | Double stops | Quality | For us |
|---|---|---|---|---|---|---|
| Sayegh DP | none | no | rule | ? | – | core |
| Maezawa HVM+VPM | none | no | via audio string | no | 54:5 preference | features |
| Noguchi plugin | none | no | per-string open cost | yes | 90 % cello scales | weights |
| Nagata HMM | textbooks | yes (l, r) | expressiveness | no | ~90 % / ~75 % | skill knob |
| Jen BLSTM + rules | TNUA | input only | learned | no | macro F1 .67/.24/.41 | modes |
| Cheung SSVAE | TNUA | input only | learned | no | MRR .87/.72/.72 | metrics |
| PD learning (guitar) | tabs | stage-based | feature | yes | 12 % → 4 % errors | weight fitting |
| Transformers (guitar) | DadaGP | yes | – | yes | ~70 % tab acc. | needs data we lack |

---------------------------------------------------------------------------------------------

## 12. Recommended design for our implementation

Goal: JavaScript in the browser. Fingering for any MIDI melody line (violin, viola or cello,
with double stops), computed on load in ≪ 100 ms, driving 3-D hands and a bow. Reuse the
#029 structure (`fingering/fingering.js` search, `motion.js` trajectories, coupled-joint finger IK).

### 12.1 Pipeline
1. Notes per track; group onsets within 30 ms into events of 1–4 notes. Pick the instrument from
   the GM program (41/42/43) or the range, with a user override.
2. Bowing pre-pass (§12.6). Slurs come from MusicXML; for MIDI, notes overlapping or with
   < 30 ms gap are legato, up to 4–8 per bow.
3. Viterbi (§12.2–12.4), then emit {string, finger, frame base b, extension, open} per note and
   {bow direction, segment, inclination, β, force} per event.
4. Animation (§12.7).

### 12.2 State space
- s = (σ string, b frame base, f finger, x extension).
  - b = semitones of finger 1 above the open string, from 1 (half position / "low 1") up to
    ~19 on E.
  - Display names map b to TNUA positions: 1st ↔ b 1–2, 2nd ↔ 3–4, 3rd ↔ 5–6, 4th ↔ 7,
    5th ↔ 8–9, and so on.
- Frame (violin/viola), offset d − b with d = pitch − open(σ): f1 0; f2 1–2; f3 3–4 (≥ f2 + 1);
  f4 5. The extension x = high-4 allows 6, low-1 allows −1. This matches Maezawa's Pnat/Pmax and
  the TNUA offsets.
- Cello: closed frame f1..f4 = +0..+3; extended frame (+0, +2, +3, +4); thumb T above b ≈ 12 [T].
- An open note keeps the previous b, so the hand stays.
- Size: ~4–12 candidates per note, ~5–20 per double stop. Full Viterbi is O(N·S²) with S ≤ 20.

### 12.3 Cost terms (starting weights; one 1–2-position shift ≈ 4–6)

| Term | Suggested formula | Basis |
|---|---|---|
| Shift (both stopped, b changes) | (2.5 + 1.5·\|Δb\|)·g, with g = clamp(0.35 s/(IOI + rest), 0.3, 2) | N (3 per position), Na (c = l + 4r), Visentin DOS |
| Shift masked by an open string / rest ≥ 120 ms | × 0.5 / × 0.3 | N, Na (k₂ after open) |
| Shift on a semitone ("crawl", finger changes against direction, \|Δpitch\| ≤ 2) | −0.5 | M VPM x3 |
| Same finger, different pitch | inside a frame 3 (a hidden shift); as the shift's landing +0.5, waived for slurred expressive slides in advanced mode | M VPM x1 + HVM x4; Nagata's failure; N slide |
| Same finger to another string | 1.5; perfect fifth on adjacent strings 0.1 | N |
| String crossing | [0, 0.5, 2.5, 5.0][\|Δσ\|] × (1.5 if IOI < 120 ms); +0.5 per extra crossing inside a slur | N; TNUA skips < 2 % |
| Open string vs 4th finger | base[σ] = [0.25, 0.3, 0.4, 0.65] (G→E) × h(dur), h = 0.5 (≤ 8th), 1.5 (quarter), 3 (half+); ×2 after a slur from a stopped note. Calibrate h to TNUA open rates (16 / 26 / 52–65 %) | N, Na, §6.3 |
| 4th finger | 0.2 per use; +1.0 when repeated on different pitches | M VPM x4 |
| Position preference | 1st 0, 2nd 0.15, 3rd 0.06, 4th 0.11, 5th 0.10, 6th 0.20, 7th 0.16, then +0.1 each; +0.03·position·(strings below E) | N, M (1st/3rd bonus), TNUA 56 % / 24 % |
| Extension | 0.4 per semitone beyond the frame; cello extended 0.3 | N, M Pmax |
| Unnatural frame / wrong-direction finger | 1.0 / 2.0; ∞ beyond Pmax | M x7, x8 (x8 = 20, their largest weight) |
| Timbre continuity | 0.8 per string change inside a slurred group of ≥ quarter notes or under "sul G"; advanced mode +0.3·beats per change away from the phrase string | Sayegh, M (cantilena), N sticky string |
| Tone-colour prior | long notes at p below ~A4: −0.1 on G/D; open E on a long note +0.1 (off in beginner mode) | [T] |
| High position on a low string, fast | +0.2·(b − 7)⁺ if IOI < 150 ms | N altLowString, [T] |

Double stops and chords (vertical cost per event):
- Strings must be distinct and adjacent; triple and quadruple stops need contiguous strings.
- With strings a fifth apart, the upper offset is c = a + interval − 7, which gives the usual
  (lower, upper) finger pairs [derived; T]:
  - unison: 4 + open; 2nd: 4–1; 3rd: 3–1 or 4–2; 4th: 2–1, 3–2 or 4–3
  - 5th: the same finger (barre) or finger + open; 6th: 1–2, 2–3 or 3–4; octave: 1–4
  - 10th: 1–4 with both extensions (c − a = 9; N allows a 2-position span)
- Cost = frame violations + 0.5 per position of spread (spread ≤ 1 for 3–4 notes, ≤ 2 for pairs).
- Infeasible notes go to "divisi/ossia".
- Rolled 3–4-note chords: bow the low pair, then the high pair, 30–60 ms apart, holding the top
  pair; low fingers are freed after the roll [T].

### 12.4 Decoding and modes
- Exact first-order Viterbi; b in the state captures "the hand stays".
- Options:
  - Lp/minimax Viterbi (p ≈ 4) for "no ugly shift" (method [V], p [T]).
  - k-best (k = 3) for a Jen-style multi-path UI and for MRR/nDCG.
  - MusicXML `<fingering>`, `<string>` and "sul X" marks clamp states.
- Modes:
  - Beginner: b ≤ 2, open h × 0.3, no extensions or timbre (≈ Nagata w_l = 0.2, Jen "lowest").
  - Intermediate: up to 5th position.
  - Advanced: all positions; open/timbre × 1.5, shifts × 0.8, slurred slides allowed (w_l = 1.5).
  - Nearest: shift × 2.
- Fit about 10 weights on TNUA with path-difference / structured-perceptron updates
  w ← w − η(Φ_pred − Φ_violinist) (Radisavljevic), or with coordinate descent as in #029
  `test/tune.js`. Use leave-one-piece-out.

### 12.5 Evaluation plan
- Data: TNUA kept git-ignored in `strings/data/TNUA/`; commit only scripts.
- Preparation: align each violinist's notes to a reference by DP on the pitch sequence. Map
  (string, position, finger) to (σ, b, f) with the §2 index-pitch table.
- Metrics:
  - String / position / finger / all-three accuracy per violinist.
  - M_gen (mean of the 10 violinists), M_high (best one), M_soft (any agrees).
  - Fluency against TNUA: shifts per 100 notes (8.6), same-finger repeats (5 %), skip crossings
    (< 2 %), open rate by note value.
- Baselines: Jen/Cheung on Salut (macro F1 string .67–.83, position .24–.31, finger .41–.64).
  Ceiling: .913.
- Targets: all-three M_gen ≥ 0.75, string ≥ 0.93, position ≥ 0.85.
- Unit tests [T; check against printed scale books before freezing]:
  - first-position G, D and A major (0 1 2 3 | 0 1 2 3)
  - 3-octave G major with semitone shifts
  - open vs 4th in slow vs fast passages
  - thirds 3–1/4–2, D–A fifth barre, octave 1–4
- Cello: CelloFingering-8K (read its licence) under its leave-one-piece-out protocol, with
  Noguchi's scale map as a sanity check.

### 12.6 Bowing model
- Direction: a new bow per note unless slurred. Start with a down-bow and use down-bows after
  rests on downbeats, on chords and on accents. Retake on rests when the bow would run out [T].
- Length: per slurred group of duration D, ℓ = min(60 cm, k·D), k ≈ 15 (pp)…45 (ff) cm/s [T].
  Speed v_B = ℓ/D clamped to 5–100 cm/s [V]. Integrate the contact point along the bow
  (0–65 cm [V]) across strokes. Give phrase starts a whole bow.
- Contact point and force from dynamics: ff ≈ 12–20 mm, 1–1.5 N; mf ≈ 25 mm, 0.5 N;
  pp ≈ 35–45 mm, 0.2 N [T]. Clamp to 5–60 mm and 0.1–2 N [V]. Move closer to the bridge in high
  positions (shorter vibrating length) [T].
- Inclination θ = θ_E + 21.7°·(steps from E) [V-derived]; double stops at the midpoint. String
  crossings lead bow changes by ~15° of phase in fast patterns [V]; otherwise ramp over
  min(60 ms, ½ IOI) ending at the onset.

### 12.7 Animation mapping
1. Neck: stop position x(d) = L(1 − 2^(−d/12)) from the nut. L ≈ 328 mm violin, ~380 mm viola,
   ~690 mm cello [T]. String spacing ~5.5 mm at the nut, ~11 mm at the bridge, cambered [T].
2. Hand anchor: index MCP above x(b), thumb opposite finger 1. For b ≥ 7 the thumb moves to
   the neck heel and the palm rides the rib [T].
3. Shift: start at t_on − DOS, with DOS = min(0.35 s, 0.8·gap) [V-derived from Visentin]; arrive
   ~30 ms early; minimum-jerk path. On slurred shifts the old finger slides as a guide finger,
   otherwise it lifts. Thumb-led on down-shifts, wrist-led on up-shifts.
4. Fingers: tip IK to (x(d), string), using the #029 planar IK (DIP ≈ ⅔ PIP), more curl on high
   strings. Descending on one string, place the next lower finger 50–150 ms early (Baader).
   Lifted fingers hover 3–8 mm over their frame slots. Vibrato on stopped notes ≥ 0.4 s:
   ±4–6 mm at 5–6 Hz, starting ~150 ms in [T].
5. Left arm: the elbow swings right (under the instrument) for the G string and out for E;
   two-bone IK from the shoulder [T].
6. Bow: a rigid body at the contact point (string, β), with the position along the stick from
   §12.6, inclination θ(σ) and skewness ≈ 0 ± 5°. Right arm by two-bone IK plus wrist. The wrist
   leads bow changes and the forearm pronates toward the tip. Rolled chords sweep θ.
7. Sync: onset = finger down ≤ 50 ms before the bow change (inside Baader's −12…+60 ms). Open
   notes free the left hand to pre-shift, which is why the open-shift discount exists.

---------------------------------------------------------------------------------------------

## 13. References ([V] fetched this session; URLs/DOIs checked Oct 2026)

Bowed-string fingering
1. Sayegh S.I. (1989). CMJ 13(3):76–84. [V, via refs]
2. Radicioni D., Anselma L., Lombardo V. (2004). CIM04. https://www.parncutt.org/CIM04/CIM04_paper_pdf/Radicioni_Anselma_Lombardo_CIM04_proceedings.pdf [V]
3. Radicioni D., Lombardo V. (2005) ICMC, http://hdl.handle.net/2027/spo.bbp2372.2005.166; (2005) LNCS, DOI 10.1007/11558590_47; (2007) Constraints, DOI 10.1007/s10601-007-9015-y [V, abstracts]
4. Maezawa A. et al. (2010). IEA/AIE, LNCS 6098:249–259. DOI 10.1007/978-3-642-13033-5_26 [V, abstract]
5. Maezawa A., Itoyama K., Komatani K., Ogata T., Okuno H.G. (2012). CMJ 36(3):57–72. DOI 10.1162/COMJ_a_00129 [V]
6. Maezawa A. et al. (2009). Bowed string sequence estimation… IEEE ISM, pp. 9–16 [V, via refs]
7. Nagata W., Sako S., Kitamura T. (2014). ICMC|SMC, pp. 1233–1238. http://speech.di.uoa.gr/ICMC-SMC-2014/images/VOL_2/1233.pdf [V]; IEEJ Trans. EIS 134(4):581–586 [V, via refs]
8. Sako S., Nagata W., Kitamura T. (2015). CRF, HCII, pp. 485–494 [V, via refs]
9. Jen Y.-H., Chen T.-P., Sun S.-W., Su L. (2021). IUI, pp. 208–212. DOI 10.1145/3397481.3450661; https://github.com/Tsung-Ping/Violin-Fingering-Generation [V]
10. Interactive automatic violin fingering recommendation interface (2021). IEEE AIVR. https://ieeexplore.ieee.org/document/9644347 [V, via repo]
11. Cheung V.K.M., Kao H.-K., Su L. (2021). ISMIR, pp. 113–120. https://archives.ismir.net/ismir2021/paper/000013.pdf; https://github.com/vkmcheung/violin-ssvae [V]
12. YTVF: https://github.com/wayonbvc/Violin-Fingering-Generation-Through-Audio-Symbolic-Fusion [V]
13. CelloFingering-8K: https://github.com/UiinKim/CelloFingering-8K [V]
14. Noguchi K. (2026). https://github.com/knoguchi/violin-fingering [V]
15. Lee J. Optimizing fingerings on bowed instruments. http://www.library.distantreader.org/stacks/journals-ojs/path/path-5467.pdf [V]
16. Su Y., Wang Y. (2024). Soft Computing 28:8279–8291. DOI 10.1007/s00500-024-09631-0 [V, abstract]
17. Huron D., Trevor C. (2016). Are stopped strings preferred in sad music? EMR 11(2):261–269 [V, via refs]

Guitar
18. Radisavljevic A., Driessen P. (2004). ICMC. http://www.ece.uvic.ca/~peterd/papers/PDL_paperICMC2004_ver9.PDF [V]
19. Tuohy D.R., Potter W.D. (2005). ICMC, pp. 499–502. https://quod.lib.umich.edu/i/icmc/bbp2372.2005.013/ [V, abstract]; Tuohy (2006) thesis, https://ai.uga.edu/sites/default/files/inline-files/theses/tuohy_daniel.pdf [V]
20. Heijink H., Meulenbroek R.G.J. (2002). J. Motor Behavior 34(4):339–351. DOI 10.1080/00222890209601952 [V]
21. Hori G., Kameoka H., Sagayama S. (2013). JIP 21(2):264–271; SMC-ICMC 2014 [V]; Hori G., Sagayama S. (2016) ISMIR, pp. 448–453 [V, via refs]; (2017) SMC, p. 386, http://smc2017.aalto.fi/media/materials/proceedings/SMC17_p386.pdf [V]
22. Kehling C. et al. (2014). DAFx. https://dafx.de/paper-archive/2014/dafx14_christian_kehling_automatic_tablature_trans.pdf [V]
23. Wiggins A., Kim Y. (2019). TabCNN. ISMIR, pp. 284–291 [V, via refs]
24. Edwards D., Riley X., Sarmento P., Dixon S. (2024). MIDI-to-tab. arXiv 2408.05024 [V]; DadaGP arXiv 2107.14653 [V, abstract]
25. Hamberger A., Murgul S., Schmidt J., Heizmann M. (2025). Fretting-Transformer. arXiv 2506.14223 [V]

Biomechanics
26. Visentin P., Li S., Tardif G., Shan G. (2015). PeerJ 3:e1299. DOI 10.7717/peerj.1299 [V]
27. Baader A.P., Kazennikov O., Wiesendanger M. (2005). Cogn. Brain Res. DOI 10.1016/j.cogbrainres.2004.11.008 [V]
28. Kazennikov O., Wiesendanger M. (2009). Motor Control 13(3):297 [V, abstract]
29. Schoonderwaldt E., Altenmüller E. (2014). PLoS ONE 9(9):e106615. DOI 10.1371/journal.pone.0106615 [V]

Bowing
30. Schoonderwaldt E. (2009). PhD, KTH. https://www.speech.kth.se/publications/pdfs/schoonderwaldt_e.pdf [V]
31. Mores R. (2016). DAGA. https://pub.dega-akustik.de/DAGA_2016/data/articles/000027.pdf [V]; Schelleng J.C. (1973). JASA 53(1) [T]
32. Demoucron M. (2010). Vienna Talk. https://viennatalk.mdw.ac.at/papers/Pap_01_50_Demoucron.pdf [V]; PhD 2008 [V, abstract]; Schoonderwaldt & Demoucron (2009) JASA 126(5) [V, abstract]
33. Maestre E. et al. (2009). ICMC. http://www.mtg.upf.edu/static/media/maestre-esteban-ICMC-2009.pdf [V]; Maestre, Pérez, Ramírez (2010). ICMC. http://www.mtg.upf.edu/system/files/publications/icmc_maestre_perez_ramirez2010.pdf [V]

Motion, data, robots
34. Shlizerman E. et al. (2018). CVPR. https://openaccess.thecvf.com/content_cvpr_2018/html/Shlizerman_Audio_to_Body_CVPR_2018_paper.html [V]
35. Kao H.-K., Su L. (2020). ACM MM, pp. 147–155. DOI 10.1145/3394171.3413848 [V]
36. Hirata A., Tanaka K., Hamanaka M., Morishima S. (2022). SIGGRAPH Posters [V]
37. Nishizawa H. et al. SyncViolinist. arXiv 2412.08343; https://github.com/Kakanat/SyncViolinist [V]
38. Qiu Z., Jin Y. et al. (2025). ELGAR. arXiv 2505.04203 [V]
39. Yoo S.J. et al. VioPose. arXiv 2411.13607 [V]
40. Huang Y.-F. et al. (2024). MOSA. IEEE/ACM TASLP. DOI 10.1109/TASLP.2024.3407529; Zenodo 10.5281/zenodo.11393449 [V]
41. Li B. et al. (2019). URMP. IEEE TMM. https://labsites.rochester.edu/air/projects/URMP.html [V]
42. Toyota (2007). https://global.toyota/en/download/2731429 [V]
43. Horigome K., Shibuya K. (2024). Front. Robot. AI 11:1439629. DOI 10.3389/frobt.2024.1439629 [V]; Shibuya (2011) DOI 10.1007/978-3-642-22291-7_11 [V, abstract]
44. Ghost Play (2022). NIME. https://nime.pubpub.org/pub/i9nvg1yi [V, abstract]
45. Kaushik A. (2026). MusicSynth. arXiv 2605.17181 [V]
46. ViolinDiff arXiv 2409.12477 (https://github.com/daewoung/ViolinDiff); VIOLET arXiv 2608.07944; VioPTT arXiv 2509.23759 [V, abstracts]
