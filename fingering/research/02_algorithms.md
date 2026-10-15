# 02 — Automatic piano fingering & pianist-hand simulation: algorithms, research, software

Research brief, Oct 2026. Every reference below was opened (paper PDF, publisher page, arXiv
abstract or source repo) while writing this; where a detail comes from a secondary source
(e.g. a re-implementation rather than the original paper) that is said explicitly.
"Verified in source" = read in the PDF text or code; "per abstract" = only the abstract/landing
page was accessible.

Contents
1. Taxonomy and the one-paragraph answer
2. Rule/cost-based models (Parncutt 1997, Jacobs 2001, Sloboda 1998, Hart 2000, Al Kasimi 2007,
   Viana, Lin & Liu, Radicioni, Robine, Balliauw 2015/2017, Badgerow)
3. Statistical / learned models (Yonebayashi 2007, Nakamura 2014/2020 + PIG, Guan/Zhao 2022,
   Ramoneda 2022, Srivatsan 2022, Randolph CRF 2023, 2023–2026 work)
4. Datasets & evaluation metrics (PIG format, licence, M_gen/M_high/M_soft/M_rec, fluency metrics)
5. Software (pydactyl, pianoplayer, Nakamura's HMM code, Balliauw VNS, others; MuseScore)
6. Hand motion / animation (pianoplayer-vedo, RoboPianist, PianoMime, RP1M/OmniPianist,
   FürElise, PianoMotion10M, Unity roboPianist) and how they go from fingering to pose
7. Comparison table
8. Recommended design for our implementation (JS, in-browser, polyphonic, full MIDI files)
9. Reference list with URLs/DOIs

---------------------------------------------------------------------------------------------

## 1. Taxonomy and short answer

- Rule/cost-based ("ergonomic"): hand-written difficulty rules over note pairs/triples, solved
  by shortest path / DP (Parncutt 1997, Hart 2000, Al Kasimi 2007), or metaheuristics
  (Balliauw tabu/VNS, Viana GA). No training data needed; tunable for hand size.
- Statistical: HMMs whose transition probs = finger sequence statistics and output probs =
  pitch interval given finger pair (Yonebayashi 2007, Nakamura 2014/2020). Trained on PIG.
  3rd-order HMM was SOTA on PIG in 2020 (M_gen 64.5 % vs human 71.4 %).
- Neural: BiLSTM/FF taggers (Nakamura 2020 baselines), PdF BiLSTM (Guan/Zhao 2022),
  autoregressive LSTM / GNN encoders with beam search (Ramoneda 2022, ArGNN M_gen 66.8 %),
  checklist + REINFORCE (Srivatsan 2022, M_gen ≈ 69 %), CRF (Randolph 2023).
- Physics/RL hands: RoboPianist uses PIG fingerings as dense reward; RP1M/OmniPianist
  replace that with per-step optimal-transport finger assignment; FürElise & PianoMotion10M
  learn motion from captured/video data (MANO hands) with diffusion models.

Short answer for us: the gap between a well-tuned cost model and the best neural model on PIG
is only a few points of M_gen (all are ~5–10 points below inter-annotator agreement), while a
cost model is tiny, explainable, hand-size-adjustable and fast. A per-hand Viterbi over
chord-fingering states with Parncutt/Jacobs/Balliauw costs (physical distances, time-aware)
is the right core for an in-browser real-time system (section 8).

---------------------------------------------------------------------------------------------

## 2. Rule / cost-based models

### 2.1 Parncutt, Sloboda, Clarke, Raekallio & Desain (1997)
"An ergonomic model of keyboard fingering for melodic fragments", Music Perception 14(4):341–382.
DOI 10.2307/40285730 (resolves to UC Press). Author PDF:
https://static.uni-graz.at/fileadmin/_Persoenliche_Webseite/parncutt_richard/Pdfs/PaSlClRaDe97_FingeringModel.pdf
(all rules/table below verified in that PDF).

Approach. Monophonic, right hand (LH by mirroring). (1) Generate all fingerings whose
consecutive intervals lie within [MinPrac, MaxPrac] for the finger pair (hard constraint; same
finger on different consecutive notes not allowed). (2) Score each with 12 additive rules
(weights all 1 in the paper). (3) Rank. For longer passages the same rules are evaluated on a
layered graph (nodes = note×finger, trigram rules folded in) and solved with a Dijkstra-style
left-to-right sweep; worst case ≤ n·5·4·4+2 nodes, ~linear time.

Span table (Table 1, RH, semitones; f-g = finger on first note → finger on second; positive =
rising). Values below match both the PDF and pydactyl's `FINGER_SPANS`:

| Pair | MinPrac | MinComf | MinRel | MaxRel | MaxComf | MaxPrac |
|------|--------:|--------:|-------:|-------:|--------:|--------:|
| 1-2  | -5 | -3 | 1 | 5  | 8  | 10 |
| 1-3  | -4 | -2 | 3 | 7  | 10 | 12 |
| 1-4  | -3 | -1 | 5 | 9  | 12 | 14 |
| 1-5  | -1 |  1 | 7 | 10 | 13 | 15 |
| 2-3  |  1 |  1 | 1 | 2  | 3  | 5  |
| 2-4  |  1 |  1 | 3 | 4  | 5  | 7  |
| 2-5  |  2 |  2 | 5 | 6  | 8  | 10 |
| 3-4  |  1 |  1 | 1 | 2  | 2  | 4  |
| 3-5  |  1 |  1 | 3 | 4  | 5  | 7  |
| 4-5  |  1 |  1 | 1 | 2  | 3  | 5  |

Derivation rules stated in the paper: MaxComf = MaxPrac − 2 (all pairs); MinComf = MinPrac + 2
for thumb pairs, = MinPrac otherwise; non-thumb MaxRel = 2·(finger difference), MinRel =
MaxRel − 1; thumb MaxRel = MaxComf − 3, thumb MinRel = 2·(finger difference) − 1.
Reverse pair g-f: negate and swap Min/Max (e.g. MaxPrac(2-1) = +5, MinPrac(2-1) = −10).
LH: reverse the pair order (LH 2-1 uses RH 1-2 row). Same-finger pairs are all 0. Paper notes
~13.7 mm per semitone (165 mm octave) and suggests mm instead of semitones (done by Jacobs).

The 12 rules (exact wording paraphrased tightly; costs exact):

| # | Name (pydactyl tag) | Scope | Cost |
|---|------|-------|------|
| 1 | Stretch (str) | consecutive pair | 2 per semitone the interval exceeds MaxComf or is below MinComf |
| 2 | Small-Span (sma) | pair | interval < MinRel: 1/semitone if thumb in pair, 2/semitone otherwise (includes thumb-passing: E4→G4 played 3-1 = 3+3 = 6 pts) |
| 3 | Large-Span (lar) | pair | interval > MaxRel: 1/semitone with thumb, 2/semitone without |
| 4 | Position-Change-Count (pcc) | trigram (n1,n2,n3) | if interval n1→n3 > MaxComf or < MinComf for (f1,f3): "full change" = 2 pts if f2 is thumb AND n2 lies between n1,n3 AND n1→n3 > MaxPrac or < MinPrac; otherwise "half change" = 1 pt |
| 5 | Position-Change-Size (pcs) | trigram | n1→n3 < MinComf: MinComf − interval; > MaxComf: interval − MaxComf (points = semitones) |
| 6 | Weak-Finger (wea) | note | 1 each time finger 4 or 5 is used |
| 7 | Three-Four-Five (345) | trigram | 1 each time fingers 3,4,5 occur consecutively in any order (overlapping groups count) |
| 8 | Three-to-Four (3t4) | pair | 1 each time 3 is immediately followed by 4 |
| 9 | Four-on-Black (bl4) | pair | 1 each time 3 and 4 are consecutive (either order) with 3 on white, 4 on black |
| 10 | Thumb-on-Black (bl1) | note+neighbours | 1 if thumb on black; +2 if previous note white; +2 if next note white |
| 11 | Five-on-Black (bl5) | note+neighbours | finger 5 on black: 0 base; +2 if previous white; +2 if next white |
| 12 | Thumb-Passing (pa1) | pair | 1 per thumb/finger pass on same level (W→W or B→B); 3 if lower note white by non-thumb and upper black by thumb |

Evaluation. 28 pianists fingered the openings of 7 Czerny studies (op. 821 etc.); most pianist
fingerings were among the model's lowest-cost ones, but the model also ranks many fingerings
pianists don't use (Table 4 in the PDF lists per-rule scores of the top-10). Factor analysis
(reported from Sloboda et al. 1998): rules 1,3,10,11 = "stretch" factor; 2,4,5 = "position
change"; 6,7,8 = "agility"; 9 and 12 separate; five factors explained 78 % of variance.
Known gaps (stated by authors): no tempo, no polyphony, no LH/RH interaction, semitone units
ignore missing black keys (E–F, B–C), no finger substitution, rules not orthogonal.
Code: none from the authors; pydactyl `Parncutt` class reproduces it (section 5).

### 2.2 Jacobs (2001)
"Refinements to the ergonomic model for keyboard fingering of Parncutt, Sloboda, Clarke,
Raekallio, and Desain", Music Perception 18(4):505–511. DOI 10.1525/mp.2001.18.4.505.
Publisher PDF behind a 403 wall for us; details below are from the abstract plus pydactyl's
`Jacobs` class and Balliauw 2017's description (secondary).
- Spans measured as physical distances, not semitones (the "problematic specification of finger
  spans in semitones"); pydactyl's `PhysicalRuler` uses key-centre offsets in mm
  (A, A#, B, C, C#, D, D#, E, F, F#, G, G# increments = 11.5, 15.5, 8, 23.5, 9.5, 14, 14, 9.5,
  23.5, 8, 15.5, 11.5 mm) and converts back to "equivalent semitones" by averaging each
  interval size over the 12 transpositions, so the Parncutt table can be reused.
- Weak-Finger rule: only finger 4 (no longer 5) is penalised.
- Large-Span: 1 point per semitone for all pairs (no 2× for non-thumb pairs) — reflects
  "playing of notes that are not spaced closely together".
- pydactyl's Jacobs omits the Three-Four-Five rule ("in the interests of parsimony").
- Result (per abstract): the modified model had more of the pianists' choices among its top
  predicted fingerings for the Czerny openings than the original.

### 2.3 Sloboda, Clarke, Parncutt & Raekallio (1998)
"Determinants of finger choice in piano sight-reading", J. Exp. Psychol.: Human Perception and
Performance 24(1):185–203. DOI 10.1037/0096-1523.24.1.185 (verified to resolve; text not read).
Empirical companion to 2.1, as quoted in Parncutt 1997 fn. 22: 17 pianists sight-read 7 Czerny
studies twice (~30 000 fingered notes). Finger transition 4→3 occurred 1663× vs 3→4 1142×
(45 % more, p<.01) — the evidence for rule 8; other asymmetries (3→1 > 1→3, …) not modelled.
Factor-analysis result above. Useful for us as priors for asymmetric transition costs.

### 2.4 Hart, Bosch & Tsai (2000)
"Finding optimal piano fingerings", The UMAP Journal 21(2):167–177 (COMAP, members only:
https://comap.org/membership/member-resources/item/finding-optimal-piano-fingerings-umap).
Monophonic DP: total cost = Σ local cost(finger pair, interval, key colours). Cost tables are
indexed by (white/black → white/black) × finger pair × interval 0..12 semitones, values 1–4,
999 = forbidden (pydactyl ships the table as `data/tables_0.dat`, verified). Classic textbook
DP example (MIT 6.006 lecture notes cite it). Code: pydactyl `Hart`/`HartK`; also
https://github.com/tphamdo/fingerfy-slimmed (web DP demo).

### 2.5 Al Kasimi, Nichols & Raphael (2007)
"A simple algorithm for automatic generation of polyphonic piano fingerings", ISMIR 2007
(Vienna), pp. 355–356. PDF: https://ismir2007.ismir.net/proceedings/ISMIR2007_p355_kasimi.pdf
(verified; 2-page late-breaking paper; earlier 2005 ISMIR version cited by Yonebayashi).
- Trellis: one layer per onset slice; node = every assignment of distinct fingers to the
  notes of the slice; constraints: sustained notes keep their finger (no substitution), each
  finger presses one note.
- Vertical cost (node): sum over all note pairs in the chord of c_v(finger pair, interval).
- Horizontal cost (edge): average over all pairs (one note from each chord) of
  c_h(finger pair, interval): cost(n_a→n_b) = (1/N) Σ_{i∈a, j∈b} c_h(i→j).
- They set c_h = c_v except for crossovers (direction of pitch motion opposite to finger
  order), which get a separate, cheaper-if-thumb function.
- Cost functions are user-elicited per finger pair: smallest comfortable interval, comfort zone,
  "nearly impossible" interval → piecewise-linear curve (example for 2-5: comfort 4–7 semitones,
  near impossible > 11).
- Viterbi over the trellis. Evaluation: qualitative only. No black/white modelling, no hand split.
  This is the template for our chord-state Viterbi.

### 2.6 Other rule-based work (brief)
- Viana et al. — "SIEDP" genetic-algorithm fingering system; 2003 SBCM paper improves UI
  (score-editor input) and GA speed: https://compmus.ime.usp.br/sbcm/2003/researchpapers/sbcm-researchpaper-2003-0.pdf
  (abstract only). Monophonic.
- Lin & Liu (2006) "An intelligent virtual piano tutor", ACM VRCIA 2006, pp. 353–356,
  DOI 10.1145/1128923.1128986 — online/real-time extension of Parncutt's model for a tutor
  (summary per Nakamura 2020 §2).
- Radicioni, Anselma & Lombardo (2004), CIM04 Graz, "A segmentation-based prototype to compute
  string instruments fingering": https://www.parncutt.org/CIM04/CIM04_paper_pdf/Radicioni_Anselma_Lombardo_CIM04_proceedings.pdf
  — constraint-satisfaction + segmentation, for strings (guitar), not piano; the CSP idea
  (segment into hand positions, then minimise changes) carries over. Follow-up: Radicioni &
  Lombardo, Constraints 2007, DOI 10.1007/s10601-007-9015-y.
- Robine (2007/2009), "Analyse automatique du doigté au piano" (LaBRI; ResearchGate 29606302,
  403 for us). Cited by Balliauw for the point that fingering affects timing/expression (e.g.
  small lags at thumb passes). Not evaluated here.
- De Prisco et al., differential-evolution / GA with learned fitness; 89.2 % on two pieces only
  (per Nakamura 2020 §2).

### 2.7 Balliauw, Herremans, Palhazi Cuervo & Sörensen (2015, 2017)
- 2015: "Generating fingerings for polyphonic piano music with a tabu search algorithm",
  MCM 2015, LNCS, pp. 149–160, DOI 10.1007/978-3-319-20603-5_15.
  Author PDF: https://repository.uantwerpen.be/docman/irua/524da9/10411.pdf
- 2017: "A variable neighborhood search algorithm to generate piano fingerings for polyphonic
  sheet music", Int. Trans. in Operational Research 24(3):509–535, DOI 10.1111/itor.12211.
  Author PDF (verified): https://repository.uantwerpen.be/docman/irua/77a480/128585_2017_10_03.pdf
- Distances in "imaginary black key" units: insert phantom keys between E–F and B–C, so every
  semitone between adjacent white keys counts 2; 14 units/octave; parity = colour, mod 14 =
  pitch class. (pydactyl `ImaginaryBlackKeyRuler`.)
- Large right hand table (their Table 1, imaginary-key units):

| Pair | MinPrac | MinComf | MinRel | MaxRel | MaxComf | MaxPrac |
|------|--:|--:|--:|--:|--:|--:|
| 1-2 | -10 | -8 | 1 | 6  | 9  | 11 |
| 1-3 | -8  | -6 | 3 | 9  | 13 | 15 |
| 1-4 | -6  | -4 | 5 | 11 | 14 | 16 |
| 1-5 | -2  |  0 | 7 | 12 | 16 | 18 |
| 2-3 | 1 | 1 | 1 | 2 | 5  | 7  |
| 2-4 | 1 | 1 | 3 | 4 | 6  | 8  |
| 2-5 | 2 | 2 | 5 | 6 | 10 | 12 |
| 3-4 | 1 | 1 | 1 | 2 | 2  | 4  |
| 3-5 | 1 | 1 | 3 | 4 | 6  | 8  |
| 4-5 | 1 | 1 | 1 | 2 | 4  | 6  |

  Small and medium hands in their appendix (also in pydactyl as `BALLIAUW_SMALL/MEDIUM_FINGER_SPANS`,
  e.g. small 1-5: −2,0,7,10,12,14; medium 1-5: −2,0,7,12,14,16).
- 15 rules (Table 2): 1 = Parncutt Stretch (+2/unit); 2 = Small/Large-span merged (+1/unit
  below MinRel or above MaxRel); 3 = position change count (+1 if n1→n3 outside Comf, +1 more for
  full change with thumb pivot outside Prac, +1 if n1==n3 pitch but different finger); 4 =
  position-change size (+1/unit); 5 = 4th finger (+1, default weight 0!); 6 = 3→4 (+1);
  7 = 3 white/4 black (+1); 8 = thumb on black (+0.5, +1 prev white, +1 next white — halved);
  9 = 5 on black (0, +1, +1 — halved); 10 = same-level pass (+1); 11 = thumb on black crossed by
  finger on white (+2); 12 = same finger on n1,n3 with n2 in between (+1, new; prefers 2-1-3
  over 2-1-2); 13 = per unit outside MinPrac/MaxPrac (+10, soft version of the hard constraint);
  14 = within a chord apply rules 1, 2 (doubled) and 13 — vertical cost; 15 = repeated identical
  slice played with different fingers (+1 per finger).
  Hard constraint: one finger cannot play two keys sounding together.
  Rules 3–12 monophonic only; 1, 2, 13, 15 for both; 14 polyphonic.
- Search: VNS (swap/change1/change2 neighbourhoods + perturbation of consecutive slices),
  C++, MusicXML in/out. Runtime 110 s for a 203-note minuet (both hands), 38 s for a 156-note
  polyphonic Händel excerpt — far from real-time; a DP would solve the same objective much faster
  except for rules that span >2 slices.
- Evaluation: qualitative vs editor fingerings (one finger differed in an 8-bar excerpt) and
  hand-size study (smaller hands → higher cost). Nakamura 2020 ran it on PIG: it only parsed 14
  of 30 test pieces; on those M_gen 56.7 vs 60.5 for 1st-order HMM (Table 4).
- Code: http://dorienherremans.com/automatic-piano-fingerings (C++, open source).

### 2.8 Badgerow variant (pydactyl)
Pianist Justin Badgerow's edits to Parncutt in pydactyl (`Badgerow` class): adjusted spans
(e.g. 1-2 MaxComf 9, 1-3 MinRel 1, MaxComf 11), plus new rules: Alternation-Pairing (+1 for
3-4-3, 4-3-4, 4-5-4, 5-4-5), Alternation-Finger-Change (+1 when n1==n3 but f1≠f3),
Thumb-on-Black-to-Weak, Black-Thumb-Pivot. Unpublished as a paper; documented in code.

---------------------------------------------------------------------------------------------

## 3. Statistical and learned models

### 3.1 Yonebayashi, Kameoka & Sagayama (2007)
"Automatic decision of piano fingering based on a hidden Markov models", IJCAI 2007,
pp. 2915–2921. PDF: http://ijcai.org/Proceedings/07/Papers/469.pdf (verified).
- Hidden state = finger (hand/finger form); observation = pitch transition as a 2-D vector on
  the keyboard (left/right and front/back, i.e. white/black row); output prob b_{s1,s2}(d) is a
  2-D Gaussian per finger pair (e.g. RH 3→5 from F# most likely lands on A).
- Viterbi decoding. Parameters set by hand from hand anatomy (finger lengths, thumb mobility)
  then hand-tuned; no learning. Monophonic RH; extendable to chords.
- Results qualitative: good interval/finger-pair matching, sensible crossings, thumb-on-black
  avoided; failures with repeated notes (no duration) and awkward hand motion (1st-order only).

### 3.2 Nakamura, Ono & Sagayama (2014) — merged-output HMM
"Merged-output HMM for piano fingering of both hands", ISMIR 2014, pp. 531–536. Jointly
decides hand assignment and fingering from a single note stream (two hand HMMs whose outputs
are merged). Still the reference for statistical hand separation.

### 3.3 Nakamura, Saito & Yoshii (2020) — "Statistical learning and estimation of piano fingering"
Information Sciences 517:68–85, DOI 10.1016/j.ins.2019.12.068; arXiv:1904.10237 (verified v2).
Accompanying page with source code (C++), trained results and visualiser:
https://statpianofingering.github.io/demo.html
- Models: 1st/2nd/3rd-order HMMs. P(f) = P(f1)ΠP(f_n|f_{n−m..n−1}); output
  P(p_n|p_{n−1}, f_{n−1}, f_n) = F(p_n − p_{n−1}; f_{n−1}, f_n) (transposition symmetry).
  Higher order output prob ∝ Π_l P(p_n|p_{n−l}, f_{n−l}, f_n)^{α_l} (pairwise decomposition);
  transitions smoothed by linear interpolation (λ_l).
- Pitch representations: integral (semitones) vs lattice (2-D keyboard: x = white-key-ish
  position, y ∈ {0,1} = row); intervals beyond δp_max = 15 pooled. Lattice slightly better.
- Chords: notes with |t_n − t_{n−1}| ≤ 30 ms are a chord; within a chord, output prob is 0 when
  pitch direction and finger direction disagree (no crossing inside chords). Improves all metrics
  (e.g. 1st-order lattice: M_gen 60.0 → 61.6).
- Chord HMM (probabilistic Al Kasimi): states per chord, transition and output are products of
  pairwise factors across chords (β1, γ1) and within chord (β2, γ2), weighted by K^−ζ.
- Optional symmetries: time inversion F(d; f1,f2) = F(−d; f2,f1) and LH/RH reflection — help when
  data is small.
- Hands are given (upper staff = RH, lower = LH); each hand decoded independently.
- Training: miscellaneous subset (120 pieces); test: 30 composer pieces (Bach, Mozart, Chopin,
  ≥4 annotators each). Hyper-params by Bayesian optimisation (GP-MI, 200 iters).
- Results (Table 2, test set):

| Method | M_gen | M_high | M_soft | M_rec |
|---|---|---|---|---|
| 1st HMM | 61.7 | 68.3 | 82.8 | 74.0 |
| 2nd HMM | 64.3 | 70.8 | 85.3 | 77.6 |
| 3rd HMM | 64.5 | 71.0 | 85.5 | 77.8 |
| Chord HMM | 61.2 | 67.7 | 81.7 | 73.8 |
| DNN FF | 61.5 | 66.2 | 82.5 | 69.5 |
| DNN LSTM | 61.3 | 66.1 | 82.8 | 69.5 |
| Human | 71.4 | 79.1 | 90.8 | 84.3 |

  Conclusions: high-order HMMs best; DNNs weaker on sequential consistency (M_rec); limitations
  = ignores phrase boundaries/rests and inter-hand dependence. Learning-curve: ~2 % more M_gen
  expected from more data.

### 3.4 Zhao, Guan & Li (Guan et al.) 2022 — PdF model
"Estimation of playable piano fingering by pitch-difference fingering match model",
EURASIP J. Audio, Speech, Music Process. 2022 (preprint arXiv:2108.09058, verified). Input =
pitch-difference sequence; BiLSTM learns PdF mapping; combined with prior finger-transfer rules
to guarantee playability; new metric IFR ("incapable-performing fingering rate", fraction of
unplayable transitions). Claims +3 % M_gen and +1.6 % M_high over 3rd-order HMM with IFR = 0.
Code: not found.

### 3.5 Ramoneda, Jeong, Nakamura, Serra & Miron (2022)
"Automatic piano fingering from partially annotated scores using autoregressive neural
networks", ACM Multimedia 2022, DOI 10.1145/3503161.3548372. PDF:
https://eita-nakamura.github.io/articles/Ramoneda_PianoFingeringFromPartiallyAnnotatedScores_2022.pdf
(verified). Code https://github.com/PRamoneda/Automatic-Piano-Fingering, eval framework
https://github.com/PRamoneda/APF_eval, ThumbSet data https://doi.org/10.5281/zenodo.6433702.
- ThumbSet: 2523 MuseScore-community scores with partial, noisy fingerings; used for
  pre-training; label smoothing 30 % (≈ 1 − inter-annotator agreement).
- ArLSTM (pitch-only encoder) and ArGNN (graph encoder over notes with onset/voice edges, handles
  chords) + autoregressive decoder with beam search; fine-tuned on PIG.
- Results (both hands, PIG test): ArGNN-Thumb M_gen 66.84, M_high 72.62, M_soft 86.83,
  M_rec 78.55; ArLSTM-Thumb 65.34/71.73/85.49/77.80; their re-run HMM2 63.78/69.49/83.59/76.12.
  Inference: HMM ≈ 0.3–0.7 ms vs ArGNN ≈ 160 ms per piece (their table).
- Related by the same author: RL fingering (arXiv:2111.08009, https://github.com/PRamoneda/RL_PianoFingering),
  difficulty from fingering (ICASSP 2022, arXiv:2203.13010).

### 3.6 Srivatsan & Berg-Kirkpatrick (2022) — checklist models
"Checklist models for improved output fluency in piano fingering prediction", ISMIR 2022,
arXiv:2209.05622 (verified). BiLSTM encoder + "checklist" of recently used fingers and their
keyboard positions fed to an autoregressive MLP; trained with cross-entropy then REINFORCE to
penalise disfluent patterns. Inputs: relative-distance or lattice encoding beats one-hot MIDI
(Bi-LSTM M_gen 66.7 → 69.6). New fluency metrics: anchored 4-gram precision, thumb crosses,
thumbless crosses, crossed chords, hops (same finger, different consecutive notes), smears
(one finger, 2 chord notes), step spread / chord spread (semitones per finger). HMM-3 has the
best M_gen (70.2 in their protocol) and 4-gram (39.5) but many thumbless crosses; checklist +
REINFORCE cut hops/smears drastically (e.g. 334→53 smears) at similar M_gen; human raters
preferred it. Lesson: per-note accuracy alone hides unplayable output — measure fluency too.
Code: not located.

### 3.7 Randolph, Di Eugenio & Badgerow (2023) — CRF
"Modeling piano fingering decisions with conditional random fields" (2023):
http://nlp.lab.uic.edu/wp-content/uploads/sites/314/2023/06/Randolph_CRF2.pdf (verified).
Linear-chain CRF with hand-engineered features (Parncutt-style); new corpora (scales,
arpeggios, broken chords, Beringer, "L1full"); on PIG 5-fold CV of training set, weighted
M_gen 67.07 %; on the official test split CRF slightly ahead on M_gen, HMM ahead on relaxed
metrics. Important critique: PIG's "channel" field is the hand that actually played the note, not
the staff — so evaluating on PIG with given hands leaks hand assignment.
Earlier: Randolph & Di Eugenio, "Dactylize" data collection; DHCS 2014 paper
(http://nlp.cs.uic.edu/PS-papers/DRandolph-DHCS14.pdf).

### 3.8 2023–2026 work (selection)
- Moryossef et al. 2023, "Extracting piano fingering instructions from videos" (arXiv:2303.03745):
  video + MIDI → fingering, F1 97 %, 90 videos → 150 K fingered notes (largest at the time).
- PianoVAM (Kim et al., ISMIR 2025; arXiv:2509.08800; https://github.com/yonghyunk1m/PianoVAM-Code):
  106 recordings, 10 amateurs, ~21 h video/audio/MIDI/hand landmarks + semi-automatic fingering.
- PiAnnotate (arXiv:2605.23982, 2026): web tool adding expert fingering to the FürElise dataset.
- Penner & Hindle (arXiv:2609.28787, Sep 2026): 8 statistical approaches (HMM, rule-based,
  N-gram LM, "Synthesis") for joint hand + finger annotation of transcribed notes; on PIG hand
  separation 90.8 %, joint hand+finger accuracy 56.6 %; full audio→fingered-score pipeline.
- Robot-RL fingering without labels: RP1M (Zhao et al., CoRL 2024, arXiv:2408.11048) and
  OmniPianist (arXiv:2511.02504) assign fingers to keys per step by optimal transport over
  fingertip→key distances; "matches human-annotated fingering performance" for the RL task with
  ~3 % compute overhead.
- No published LLM-based fingering model with PIG results was found in this search; transformer
  use is in motion generation (PianoMotion10M, PianoFlow) and robot policies (OmniPianist).

---------------------------------------------------------------------------------------------

## 4. Datasets and evaluation

### 4.1 PIG (PIano fingerinG) dataset
Page: http://beam.kisarazu.ac.jp/research/PianoFingeringDataset/ (verified; v1.12, 2022-05-12).
- 150 pieces (24 composers), 309 fingerings, ~100 K fingered notes; one annotated section per
  piece (≈ 1 page, ~20 bars, ~300 notes). Bach/Mozart/Chopin subsets (10 pieces each, ≥4
  pianists) + 120-piece miscellaneous subset. Annotators: conservatory graduates / >20 yr players,
  fingerings they actually use. Finger substitutions only 0.34 % of notes.
- Licence: "Only nonprofit, academic use is allowed"; must cite Nakamura et al. 2020; download
  via a registration form (register.php). Not redistributable → do not commit it to our repo;
  keep it in a git-ignored local folder and ship only our evaluation script.
- File format (`NNN-M_fingering.txt`, verified from paper + pianoplayer/pydactyl readers):
  first line `//Version: PianoFingering_v170101`, then one note per line, tab-separated, sorted
  by onset:
  `id  onset_s  offset_s  spelled_pitch  onset_vel  offset_vel  channel  finger`
  e.g. pitch `C#4`, `Eb4`; channel 0 = RH, 1 = LH; finger 1..5 RH, −1..−5 LH; substitution
  written `1_2` (RH thumb → index while held). A score PDF and a MIDI file accompany each piece.
- Official split (used by all papers above): train = miscellaneous subset, test = the 30
  composer pieces. A copy of the split: `official_split.json` in Ramoneda's repo.
- Visualiser: https://fingeringdata.github.io/FingeringVisualizer.html

### 4.2 Metrics (Nakamura 2020 §6.2)
With ground truths G_1..G_K for a piece of N notes and estimate E:
- M_gen = mean over k of matchRate(E, G_k).
- M_high = max over k of matchRate(E, G_k).
- M_soft = fraction of notes where E matches at least one G_k.
- M_rec = (N − E_rec)/N, where E_rec = min edit cost over "recombined" ground truths: the
  reference may switch from G_k to G_l only at notes where they agree, each switch costs
  C_rec = 1, each mismatch C_sub = 1 (DP; code in Nakamura's package, Appendix A).
Averages are per piece (30 test pieces). Additional: M_cp (Ramoneda, "cost/playability"),
IFR (Zhao/Guan), fluency counts (Srivatsan 4.1). Human reference: M_gen 71.4.

### 4.3 Other data
ThumbSet (2523 partial, Zenodo), Moryossef 150 K-note video set, PianoVAM, FürElise
(HF: https://huggingface.co/datasets/rcwang/for_elise; 153 pieces, 15 pianists, ~10 h, 3-D MANO
motion + MIDI), PianoMotion10M (116 h, 10 M frames, MANO from bird's-eye video, CC BY-NC-SA).

---------------------------------------------------------------------------------------------

## 5. Software

| Tool | Lang / licence | What it does |
|---|---|---|
| pydactyl (David Randolph) https://github.com/dvdrndlph/pydactyl | Python, MIT | Framework: `Parncutt`, `Jacobs`, `Badgerow`, `Balliauw` (approx.), `Hart`, `Sayegh`, `Random`; rulers (semitone, physical mm, imaginary-black-key); networkx k-shortest paths; PIG/abcD I/O; Nakamura metrics. Best reference for exact rule code. |
| pianoplayer (Marco Musy) https://github.com/marcomusy/pianoplayer | Python, MIT, v3.0.x 2026, ~900★ | Velocity-minimising combinatorial search; MusicXML/MIDI/PIG in; vedo 3-D playback; hand sizes XXS–XXL. |
| Nakamura HMM code https://statpianofingering.github.io/demo.html | C++ (README in zip) | 1st–3rd-order HMM, chord HMM, training, all four metrics. |
| Balliauw VNS http://dorienherremans.com/automatic-piano-fingerings | C++ | Polyphonic VNS, MusicXML I/O, hand sizes. |
| Ramoneda APF https://github.com/PRamoneda/Automatic-Piano-Fingering | Python/PyTorch | ArLSTM/ArGNN, PIG split, eval. |
| Kanma/piano-fingering https://github.com/Kanma/piano-fingering | Python | Older generator with VPython 3-D player (pianoplayer's ancestor style). |
| fingerfy-slimmed https://github.com/tphamdo/fingerfy-slimmed | JS web | Hart-style DP in the browser. |
| MuseScore | — | Displays/edits fingering (MusicXML `<fingering>`) but has no automatic fingering generator (pianoplayer is the usual add-on, `-m` opens output in MuseScore). |

pianoplayer algorithm details (from `hand.py`, verified):
- Keyboard x in cm (16.5 cm octave). Finger rest offsets relative to finger 3:
  `frest = [−7.0, −2.8, 0, 2.8, 5.6]` cm × size factor (XXS .33, XS .46, S .64, M .82, L 1.0,
  XL 1.1, XXL 1.2); hand span ≈ 21 cm × factor.
- Cost of a candidate fingering over a look-ahead window of 5–9 notes (depth auto from note
  durations) = mean over steps of |x_note − x_finger| / (Δt + 0.1 s), divided by finger
  strength weight [1.1, 1.0, 1.1, 0.9, 0.8] and on black keys also by a black-key factor
  [0.3, 1.0, 1.1, 0.8, 0.7] (so thumb on black ≈ 3× costlier). After each step the other fingers
  relax toward rest offsets around the playing finger (relocation α = 0.3).
- Pruning (`skip`): same finger on different short notes; non-thumb crossings against direction;
  thumb-under onto black while ascending; fast thumb-out from black; chord order must be
  monotone; max in-chord stretch per pair (cm×hf/0.8): 3-4: 5, 4-5: 5, 2-3: 6, 2-4: 7, 3-5: 8,
  2-5: 11, 1-2: 12, 1-3: 14, 1-4: 16. Chord constraint violations → 1e6 / 2e5 penalties.
- Greedy: commit the first finger of the best window, slide by one. Hands independent.
  Chords are internally staggered by 0.05 s. Limitations listed by the author: hands independent,
  ornaments ignored, some combos excluded. Never benchmarked on PIG in the literature we found.

---------------------------------------------------------------------------------------------

## 6. Hand motion and animation: from fingering to pose

| System | Hand model | Fingering source | Pose generation |
|---|---|---|---|
| pianoplayer + vedo | Stylised boxes/spheres per finger | own optimiser | Each finger's x = its tracked position (above), key press = vertical dip; hand body follows finger 3; no joint IK. |
| Kanma piano-fingering | VPython primitives | own | same idea, chords as rapid sequence. |
| emrecancubukcu/roboPianist (Unity, GPL-3.0) https://github.com/emrecancubukcu/roboPianist | Rigged character (Mixamo/Fuse) | C# port of Kanma's fingering | Full-body IK (SAFullBodyIK) to fingertip targets; unfinished (wrist rotation, IK reach issues listed as TODO). Closest to what we want visually. |
| RoboPianist (Zakka et al., CoRL 2023, arXiv:2304.04150, https://github.com/google-research/robopianist) | 2 × Shadow Hand (22 actuators each) in MuJoCo, 88 spring keys | PIG fingerings → "REPERTOIRE-150" MIDI with labels | Deep RL (DroQ); rewards = key press + fingering (fingertip-to-assigned-key distance) + energy; lookahead of future goals; without the fingering reward F1 stays ≈ 0. |
| PianoMime (Qian et al., 2024, arXiv:2407.18178, OpenReview t0LkF9JnVb) | Shadow Hands | YouTube top-view video: MediaPipe fingertips + MIDI | IK + residual RL with style reward (track human fingertips) + task reward; distilled to generalist (≈ 56 % F1 unseen songs). |
| RP1M / OmniPianist (2024–25) | robot hands | per-step optimal transport fingertip→key | RL specialists → 1 M trajectories → flow-matching transformer. |
| FürElise (Wang, Xu, Shi, Schumann, Liu, SIGGRAPH Asia 2024, DOI 10.1145/3680528.3687703, https://for-elise.github.io/) | MANO | implicit (diffusion output gives finger order/placement) | Capture: multi-view video → 2-D keypoints → triangulate → MANO fit → IK refinement with Disklavier key events. Synthesis: diffusion model (score → reference motion), music-similarity motion retrieval, then physics policy with discriminators (imitation + RL). Code "to be released". |
| PianoMotion10M (Gan et al., 2024, arXiv:2406.09326, https://github.com/agnjason/pianomotion10m) | MANO | none explicit | Audio → position predictor (hand x/z) → position-guided diffusion gesture generator; metrics FGD/WGD/FID, position distance, smoothness. |
| Cascaded synthesis via fingertip priors (arXiv:2604.09692, 2026), PianoFlow (arXiv:2604.12856) | MANO | — | Fingertip-first then full-hand; streaming. |

Recurring patterns worth copying:
- Fingertip targets first, joints second (PianoMime, FürElise IK refinement, Cascaded 2026):
  solve where each fingertip must be (key surface point at press time), then IK the chain.
- Separate global hand placement (wrist x, slow) from finger articulation (fast) — PianoMotion10M
  splits "position predictor" and "gesture generator"; pianoplayer moves fingers around a hand
  anchor with relaxation to rest offsets.
- Rest pose: fingers curved, spaced about one white key (~2.35 cm) apart, thumb ~0.7 of an
  octave-span from finger 5; pianoplayer's frest offsets [−7, −2.8, 0, 2.8, 5.6] cm (L hand)
  are a convenient default.
- Finger lengths: scale from hand length with regression coefficients from Buchholz, Armstrong &
  Goldstein 1992, "Anthropometric data for describing the kinematics of the human hand",
  Ergonomics 35(3):261–273 (https://pubmed.ncbi.nlm.nih.gov/1572336/; segment lengths as a fraction
  of hand length, R² 0.49–0.99). Or take MANO template joint positions (MANO licence is
  non-commercial; avoid shipping the model, derive only proportions if needed).

---------------------------------------------------------------------------------------------

## 7. Comparison

| Method | Year | Type | Polyphony | Hands | Eval | Code |
|---|---|---|---|---|---|---|
| Parncutt et al. | 1997 | 12 rules + shortest path | no | RH (LH mirror) | Czerny openings vs 28 pianists | pydactyl |
| Hart, Bosch, Tsai | 2000 | cost table + DP | no | one | qualitative | pydactyl |
| Jacobs | 2001 | refined rules, mm distances | no | one | Czerny, better top-k | pydactyl |
| Yonebayashi et al. | 2007 | HMM, Gaussian outputs, hand-set | (ext.) | RH | qualitative | no |
| Al Kasimi et al. | 2007 | chord trellis, vertical+horizontal | yes | one (given) | qualitative | no |
| Lin & Liu | 2006 | online Parncutt | no | — | tutor demo | no |
| Nakamura et al. MO-HMM | 2014 | merged-output HMM | yes | both, joint split | own data | (Nakamura) |
| Balliauw et al. | 2015/17 | 15 rules, tabu/VNS | yes | both (given) | qualitative; PIG M_gen 56.7 (14 pcs) | C++ |
| Nakamura et al. | 2020 | 1–3rd-order HMM, chord HMM | yes (30 ms) | given | PIG M_gen 64.5 | C++ |
| Zhao/Guan et al. | 2022 | BiLSTM PdF + priors | partial | given | PIG +3 % M_gen vs HMM3 | no |
| Ramoneda et al. | 2022 | ArGNN/ArLSTM, beam | yes (GNN) | given | PIG M_gen 66.8 | yes |
| Srivatsan & B-K | 2022 | checklist + REINFORCE | yes | given | PIG M_gen ~69 (their protocol), fluency | no |
| Randolph et al. | 2023 | CRF | yes | given | PIG M_gen ≈ HMM | pydactyl |
| pianoplayer | 2017–26 | velocity search, window 5–9 | yes | both (given parts) | none published | MIT |
| Penner & Hindle | 2026 | HMM/N-gram/rules | yes | joint split 90.8 % | PIG joint 56.6 % | ? |

(M_gen values across papers use slightly different protocols — e.g. Srivatsan's HMM-3 reads 70.2
vs Nakamura's 64.5 — compare only within a table.)

---------------------------------------------------------------------------------------------

## 8. Recommended design for our implementation

Goal: JavaScript, in-browser, fingering for full MIDI files (both hands, chords, pedalled
textures) fast enough to compute on load (< ~200 ms for a typical piece) and, optionally,
incrementally while playing; output drives 3-D hands on the 028 grand piano.

### 8.1 Pipeline
1. Parse MIDI → notes {pitch, on, off, vel, track, channel}. Merge sustain pedal only for
   audio; for fingering use key-up times (pedal doesn't hold fingers).
2. Slice: group onsets within Δ = 30 ms (Nakamura) into slices; each slice also lists notes
   still held from earlier slices (they keep their finger — Al Kasimi constraint).
3. Hand split (section 8.2) → two note streams.
4. Per hand: Viterbi / beam DP over chord-fingering states (8.3–8.5).
5. Post-process: smooth isolated oddities (optional 2nd pass with trigram rules), emit
   per-note {hand, finger}; also emit per-slice hand anchor x for the animator.
6. Animation layer (8.7) consumes {note, hand, finger, t_on, t_off}.
Run steps 2–5 in a Web Worker; transfer typed arrays.

### 8.2 Hand split
- If the file has two piano tracks/staves (common in score-derived MIDI), trust them (PIG,
  pianoplayer, Nakamura all assume given hands), but allow overrides: a note > ~2 octaves from
  its hand's running centre and closer to the other hand flips.
- Otherwise run a small Viterbi over slices with state = split point s (MIDI pitch, notes < s →
  LH) or, better, state = (LH centre bucket, RH centre bucket). Costs: each hand's chord span
  (> MaxPrac(1-5) ≈ 15–16 semitones is infeasible, > 10 costly), > 5 notes per hand infeasible,
  hand-centre movement / Δt, crossing (LH centre > RH centre) heavy penalty, deviation from
  typical registers (LH < ~C4 < RH) weak prior. This is a cheap approximation of the
  merged-output HMM (Nakamura 2014) and the hand-separation step in Penner & Hindle 2026
  (90.8 % on PIG — a realistic target).
- Overflow (> 5 notes after split, e.g. pedalled arpeggio sustains): drop already-held notes
  from the fingering problem first (assume released, pedal holds sound), then allow a "smear"
  (one finger on two adjacent white keys ≤ 2 semitones, typically thumb), else mark unplayable.

### 8.3 State space (per hand, per slice)
- k new notes in the slice, h held notes with fixed fingers. State = assignment of distinct
  fingers to the k new notes, excluding the h held fingers, monotone in pitch (RH: higher pitch
  → higher finger; LH mirrored). Count = C(5−h, k): k=1 → 5, 2 → 10, 3 → 10, 4 → 5, 5 → 1.
  So even chords keep ≤ 10 states — no need for crossing states inside chords (Nakamura's
  zero-probability constraint).
- Hard prune: within-chord pair spans ≤ MaxPrac (vertical), transitions ≤ MaxPrac (horizontal,
  skip if Δt large — the hand can jump).
- For trigram rules (position change, Balliauw 3/4/12, Badgerow alternation) use 2nd-order DP:
  state = (prev assignment, current assignment), ≤ 100 states for chords, 25 for single notes;
  cost per step O(S²) ≤ 10⁴ — still trivial. Or approximate with a "hand anchor" (thumb x) kept
  in the state and a 1st-order DP.
- Beam: keep the best B = 64 states (2nd-order) per slice; ties broken by lower finger-movement
  cost. With N = 10 k slices that's < 10⁷ cost evaluations: tens of ms in JS with precomputed
  tables.

### 8.4 Cost model (sum, all weights tunable)
Distances: physical. Key centre x in mm (pydactyl offsets, or our 028 piano's key geometry),
converted to "equivalent semitones" by dividing by 13.7 mm (Parncutt fn. 8) — or adopt
Balliauw's imaginary-black-key units and their 3 hand-size tables directly. Expose a hand-size
scale factor (pianoplayer-style 0.6–1.2) that scales all Prac/Comf/Rel limits.

Vertical (inside a slice; Al Kasimi + Balliauw rule 14): for every finger pair in the chord,
2 × Stretch(Comf) + 2 × Rel-violation + 10 × Prac-violation, using the ascending-pair rows.

Horizontal (slice a → slice b): average over all (i∈a, j∈b) pairs (Al Kasimi) of
- Stretch: 2/unit outside [MinComf, MaxComf]
- Span: 1/unit outside [MinRel, MaxRel] (Jacobs: 1 for all pairs)
- Impractical: 10/unit outside [MinPrac, MaxPrac] (soft, Balliauw 13)
- Same-finger, different key: +3 if Δt < ~150 ms (hop; Srivatsan), else 0–1
- Repeated note, different finger: +1 (Balliauw 15) unless fast repetition (then reward change)
Note-level: thumb on black 1 (+2 per white neighbour); 5 on black +2 per white neighbour
(Balliauw halved values work better for polyphony); 4th finger 0–1 (Jacobs: 4 only);
3→4 +1; 3 white / 4 black +1; same-level thumb pass +1; thumb on black under white finger +3.
Trigram (2nd-order): position-change count (1 half, 2 full) and size (1/unit) per Parncutt;
Balliauw 12 (+1 for 2-1-2 style hops around a pivot); Badgerow alternation (+1 for 3-4-3 …).

Time awareness (missing from Parncutt, present in pianoplayer and implicitly in data):
multiply movement-related terms (stretch, position change, impractical) by
g(Δt) = clamp(t0 / (Δt + 0.05 s), 0.2, 2) with t0 ≈ 0.25 s, so slow passages tolerate leaps
and fast runs force compact positions; if the gap between slices > ~0.6 s or a rest occurs,
replace horizontal cost with a small "re-position" cost (hand can lift; Nakamura's identified
failure mode: ignoring rests/phrase boundaries).

Optional learned layer: replace/augment horizontal cost with −log P(Δlattice | f1, f2) from a
PIG-trained table (Nakamura 1st-order output probs, 5×5×31 numbers) — a lookup table, no
runtime model. Only for local experiments, since PIG is non-commercial (see licence).

### 8.5 Decoding modes
- Offline (on file load): full Viterbi per hand, both hands in parallel workers.
- Streaming / live MIDI input: fixed-lag Viterbi (commit slice t−L when processing t, L ≈ 16
  slices or 1 s), which is what pianoplayer's look-ahead window does greedily; for live keyboard
  input with no future, use L = 0 (greedy argmin from the best surviving state) and accept more
  errors.
- Pre-fingered anchors (MusicXML `<fingering>` or user clicks): clamp states at those notes,
  as pianoplayer does.

### 8.6 Evaluation plan
- PIG is downloadable after registering (nonprofit academic use only, cite Nakamura 2020).
  Keep it outside the repo (`fingering/data/PIG/` git-ignored), parse the 8-column tab files
  (skip `//` header lines; spelled pitches → MIDI; `1_2` substitutions → first finger; channel
  gives hand).
- Protocol: train/tune on the 120-piece miscellaneous subset, report on the 30 test pieces:
  M_gen, M_high, M_soft, M_rec (implement the recombination DP from Nakamura App. A; check
  against Nakamura's C++ tool or pydactyl's implementation on a few files), plus fluency counts
  (hops, smears, thumbless crosses, crossed chords, spreads) and IFR-style unplayable rate.
  Two settings: (a) given hands (comparable to literature), (b) our own hand split (report hand
  accuracy and joint accuracy, comparable to Penner & Hindle's 90.8 % / 56.6 %).
- Targets: Parncutt/Jacobs-style DP typically lands near or below the 1st-order HMM; aim for
  M_gen ≥ 61 (1st HMM), stretch goal ≈ 64 (3rd HMM) after weight tuning with coordinate descent
  or a tiny Bayesian optimiser (Nakamura tuned 2–5 weights with GP-MI); human ceiling 71.4.
- Baselines to run locally: pianoplayer (`pip install pianoplayer`; accepts PIG `.txt` and
  writes PIG-format output — direct comparison), pydactyl Parncutt/Jacobs, Nakamura HMM results
  zips (Result_FHMM1–3) for reference numbers without re-running.
- Unit tests: scale fingerings (C major RH 1-2-3-1-2-3-4-5, LH 5-4-3-2-1-3-2-1), Parncutt's
  worked examples (E4→G4 3-1 small-span = 6; C4→B4 1-3 = 4 + 2; D4→C5 2-5 stretch = 4), chords
  (C-E-G RH = 1-3-5), octave tremolo (1-5).

### 8.7 Animation mapping (fingering → hand pose)
1. Hand anchor per slice: x_hand = mean over pressed notes of (x_key − rest_offset[finger]),
   rest offsets from pianoplayer's frest × hand scale; between slices move it with a critically
   damped spring whose time constant shrinks with Δt (arrive ~60–80 ms before the next onset).
   Wrist height/yaw: slight yaw toward the direction of travel; lower and pronate for thumb on
   black / passes.
2. Fingertip targets: on press, tip at the key's striking point (white keys ~10–15 mm from the
   front edge in our model, black keys at their front third), depressed with the key; free
   fingers relax toward rest offsets around the anchor, hovering ~8–12 mm above keys; thumb
   passes: thumb target moves under the palm (lower y, tucked z) before landing.
3. Timing keyframes per note: lift-off of the previous use, approach (≈ 50–80 ms before
   t_on, scaled by tempo), contact at t_on synced to the key animation that already exists in
   grandpiano/grand-piano.js, hold until t_off, release.
4. IK: per finger analytic planar 3-link solve (MCP flexion + PIP/DIP with DIP ≈ 2/3 PIP
   coupling) in the finger's plane, plus MCP abduction to aim at the key; thumb as 3-link with
   CMC 2-DOF. Clamp joint limits; if unreachable, push the anchor (wrist) instead — the
   "fingertips first, hand second" scheme of PianoMime/FürElise refinement.
5. Proportions: hand length L ≈ 18–19 cm (adult), segment lengths from Buchholz 1992
   coefficients × L; scale with the same hand-size factor used by the fingering cost so that
   reach and fingering agree.
Data-driven alternative later: FürElise (MANO trajectories + MIDI) could supply pose priors or
retrieval clips; check its dataset licence on Hugging Face before using.

### 8.8 Summary of choices
- Per-hand 1st/2nd-order Viterbi over monotone chord assignments (≤ 10 states/slice), beam 64.
- Costs = Parncutt 1997 + Jacobs 2001 (physical distance, finger-4-only, linear large-span) +
  Al Kasimi averaging for chords + Balliauw rules 13–15 + time scaling + rest reset.
- Hand-size factor shared by fingering and IK.
- Evaluate locally on PIG with the four Nakamura metrics + fluency metrics; never redistribute PIG.

---------------------------------------------------------------------------------------------

## 9. References (URLs / DOIs checked Oct 2026)

1. Parncutt R., Sloboda J.A., Clarke E.F., Raekallio M., Desain P. (1997). Music Perception
   14(4):341–382. DOI 10.2307/40285730. PDF (author): see 2.1.
2. Jacobs J.P. (2001). Music Perception 18(4):505–511. DOI 10.1525/mp.2001.18.4.505.
3. Sloboda J.A., Clarke E.F., Parncutt R., Raekallio M. (1998). JEP:HPP 24(1):185–203.
   DOI 10.1037/0096-1523.24.1.185.
4. Hart M., Bosch R., Tsai E. (2000). UMAP Journal 21(2):167–177. COMAP link in 2.4.
5. Al Kasimi A., Nichols E., Raphael C. (2007). ISMIR 2007. https://ismir2007.ismir.net/proceedings/ISMIR2007_p355_kasimi.pdf
6. Yonebayashi Y., Kameoka H., Sagayama S. (2007). IJCAI 2007. http://ijcai.org/Proceedings/07/Papers/469.pdf
7. Lin C.-C., Liu D.S.-M. (2006). VRCIA 2006. DOI 10.1145/1128923.1128986.
8. Viana et al. (2003). SBCM. https://compmus.ime.usp.br/sbcm/2003/researchpapers/sbcm-researchpaper-2003-0.pdf
9. Radicioni D., Anselma L., Lombardo V. (2004). CIM04. URL in 2.6; Radicioni & Lombardo (2007)
   Constraints, DOI 10.1007/s10601-007-9015-y.
10. Balliauw M. et al. (2015). MCM 2015, DOI 10.1007/978-3-319-20603-5_15.
11. Balliauw M., Herremans D., Palhazi Cuervo D., Sörensen K. (2017). ITOR 24(3):509–535.
    DOI 10.1111/itor.12211.
12. Nakamura E., Ono N., Sagayama S. (2014). Merged-output HMM for piano fingering of both hands.
    ISMIR 2014, 531–536.
13. Nakamura E., Saito Y., Yoshii K. (2020). Information Sciences 517:68–85.
    DOI 10.1016/j.ins.2019.12.068; arXiv:1904.10237; code https://statpianofingering.github.io/demo.html
14. PIG dataset: http://beam.kisarazu.ac.jp/research/PianoFingeringDataset/
15. Zhao H., Guan X., Li Q. (2022). Estimation of playable piano fingering by pitch-difference
    fingering match model. EURASIP JASMP; arXiv:2108.09058.
16. Ramoneda P., Jeong D., Nakamura E., Serra X., Miron M. (2022). ACM MM. DOI 10.1145/3503161.3548372.
17. Srivatsan N., Berg-Kirkpatrick T. (2022). ISMIR. arXiv:2209.05622.
18. Randolph D.A., Di Eugenio B., Badgerow J. (2023). CRF paper, URL in 3.7.
19. pydactyl: https://github.com/dvdrndlph/pydactyl (MIT).
20. pianoplayer: https://github.com/marcomusy/pianoplayer (MIT), PyPI `pianoplayer`.
21. Zakka K. et al. (2023). RoboPianist. CoRL 2023. arXiv:2304.04150; https://github.com/google-research/robopianist
22. Qian C., Urain J., Zakka K., Peters J. (2024). PianoMime. arXiv:2407.18178 (OpenReview t0LkF9JnVb); https://pianomime.github.io/
23. Zhao Y. et al. (2024). RP1M. arXiv:2408.11048. Chen L., Zhao Y. et al. (2025) OmniPianist,
    arXiv:2511.02504.
24. Wang R., Xu P., Shi H., Schumann E., Liu C.K. (2024). FürElise. SIGGRAPH Asia 2024.
    DOI 10.1145/3680528.3687703; arXiv:2410.05791; https://for-elise.github.io/
25. Gan Q., Wang S., Wu S., Zhu J. (2024/25). PianoMotion10M. arXiv:2406.09326;
    https://github.com/agnjason/pianomotion10m
26. Moryossef A. et al. (2023). Extracting piano fingering instructions from videos. arXiv:2303.03745.
27. Kim Y. et al. (2025). PianoVAM. ISMIR 2025. arXiv:2509.08800.
28. Penner D., Hindle A. (2026). arXiv:2609.28787.
29. PiAnnotate (2026) arXiv:2605.23982; Cascaded piano hand motion synthesis (2026) arXiv:2604.09692;
    PianoFlow (2026) arXiv:2604.12856.
30. Buchholz B., Armstrong T.J., Goldstein S.A. (1992). Ergonomics 35(3):261–273.
    https://pubmed.ncbi.nlm.nih.gov/1572336/
31. emrecancubukcu/roboPianist (Unity, GPL-3.0): https://github.com/emrecancubukcu/roboPianist ;
    Kanma/piano-fingering: https://github.com/Kanma/piano-fingering
