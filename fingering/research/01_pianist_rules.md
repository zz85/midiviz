# 01 — How pianists choose fingerings: rules, traditions, ergonomics

Research brief for designing a fingering algorithm's cost model and test cases.
Finger numbers: 1 = thumb … 5 = little finger, both hands. "RH"/"LH" = right/left hand.
Spans are in semitones (st) unless stated. Source keys like [P97] point to the list at the end.
Verification: [V] = checked against a fetched source this session; [T] = standard pedagogy
(scale books, widely repeated) not individually re-fetched; [?] = plausible, needs checking.

---

## 1. Core principles that run through the whole tradition

1. **Next-note-next-finger.** Adjacent scale steps go to adjacent fingers. Parncutt et al. trace
   this to Sancta Maria (1565), C.P.E. Bach (1753) and Türk (1789) [P97][V].
2. **Few hand-position changes.** Play as many notes as possible from one position. Documented
   since Diruta and Sancta Maria in the Renaissance [P97][V].
3. **Short fingers (1, 5) on white keys, long fingers (2, 3, 4) on black.** C.P.E. Bach and Türk
   avoid 1 and to a lesser extent 5 on black keys [P97][V]. Chopin turned this around and treated
   the long-fingers-on-black shape as the hand's natural home (§2.6).
4. **Thumb passes are easiest between a finger on a black key and the thumb on a white key.**
   White→white is next, then black→black. Non-thumb on white to thumb on black is "by far the most
   difficult" and turns up only in virtuoso repertoire (Chopin Op. 25/11) [P97][V].
5. **Weak side of the hand.** Finger 4 is the least independent, and 3-4-5 runs are hard. Ortmann
   (1929): "no amount of practice can overcome entirely this physiological limitation" [P97][V].
   In sight-reading data, the 4-3 transition occurs 45% more often than 3-4 [P97][V].
6. **Same fingering for the same pattern.** Sequences, repeats and transposed figures get identical
   fingering so the motor pattern can be reused (Hummel, Czerny; Busoni and von Bülow had pupils
   practise a piece in other keys without changing the fingering [P97][V]).
7. **The music has the last word.** Phrasing, articulation, voicing and tone colour can override
   ergonomics. Neuhaus held that the best fingering is the one that best serves the music, even if
   it is not the most convenient [N][T]. Chopin used fingering for expression (§2.6).
8. **Fingering is personal.** In the PIG dataset, two pianists agree on only 60–80% of notes, and a
   human annotator matches the other annotators' fingerings 71.4% of the time (Mgen) [NSY19][V].
   There is no single right answer. Evaluate against several reference fingerings, or score
   "acceptable" rather than "identical".

---

## 2. Historical treatises (what each contributed)

### 2.1 François Couperin — *L'art de toucher le clavecin* (Paris 1716, rev. 1717) [C][T]
- Among the first systematic fingerings for the French clavecin. The thumb is numbered 1.
- Finger crossings in pairs: RH ascending 3-4-3-4, so 3 crosses over 4. Thumb passing is rare.
- Introduced **finger substitution** on a held key (*changer de doigt*) to keep legato without a
  pedal. This is the origin of the modern "4-3 on one note" marking.
- Legato and the evenness of ornaments drive the fingering. Ornaments (trills, *pincés*) are
  fingered to avoid weak-finger pairs.
- Facsimile: IMSLP "L'art de toucher le clavecin (Couperin, François)" [C].

### 2.2 C.P.E. Bach — *Versuch über die wahre Art das Clavier zu spielen* (Berlin 1753) [CPE][V]
- Gives three fingerings per hand for the C-major scale. He says all are workable, but calls the
  "older" ones more usual: RH 3 crossing over 4, LH 2 over the thumb, thumbs striking F [CPE][V].
  The modern thumb-under fingering is already one of the three.
- Makes the thumb an ordinary finger. Allows thumb-under 2, 3 and 4. Avoids 1 and 5 on black keys
  where possible. Uses the thumb right after a black key.
- Fingerings are given for all keys, so the fingering changes with the key (black-key topology).

### 2.3 Daniel Gottlob Türk — *Klavierschule* (1789) [T]
- Codifies the "next-note-next-finger" principle and avoids the thumb on black keys.
- Names *Einsetzen* (insertion): the hand moves to a new position without a thumb pass. Parncutt's
  "half change" corresponds to it [P97][V].

### 2.4 Muzio Clementi — *Introduction to the Art of Playing on the Piano Forte* (1801) [T]
- Sets out the scale fingerings in all major and minor keys that are still taught today (§3.1).
  Parncutt calls these "set out most clearly by Clementi" [P97][V].

### 2.5 J.N. Hummel (1828) and Carl Czerny (Op. 500, c. 1839) [H][T]
- Hummel, *Ausführliche theoretisch-practische Anweisung zum Piano-Forte-Spiel* (1828): hundreds of
  fingered examples on scales, passing, extension, substitution and fingering for sequences.
  Strongly favours the same fingering in every repetition of a sequence. Edition: UNT digital
  library [H].
- Czerny, *Vollständige theoretisch-practische Pianoforte-Schule* Op. 500, vol. 2 on fingering:
  scale and arpeggio fingerings, repeated notes with changing fingers (4-3-2-1), the thumb on a
  black key allowed in broken chords. His studies (Op. 299, 740, 849) are the corpus Parncutt
  used to test his model [P97][V].

### 2.6 Frédéric Chopin — *Projet de méthode* (unfinished), as reported in Eigeldinger [E][V]
- **Natural hand position E–F♯–G♯–A♯–B** (RH 1-2-3-4-5; LH 5-4-3-2-1). Long fingers sit on the
  three black keys and the short ones on white keys. He began students on the B-major scale rather
  than C [PF][KN][V].
- **Thumb on black keys is allowed** when it helps the hand. So is **sliding one finger from a black
  key to the next white key** for legato. The thumb can play two adjacent keys (e.g. the double
  notes of Op. 25/6).
- Crossing 3 over 4 and 4 over 5 in chromatic legato (Op. 10/2: 3-4-5 play the chromatic line while
  1-2 play chords).
- Fingers are unequal by nature. He saw "as many different sounds as there are fingers" and used
  this for colour rather than drilling the fingers to be equal. Fingering expresses phrasing: a
  fresh finger or a change of hand marks a new phrase [E][T].
- The PIG dataset found Chopin's pieces had the highest agreement between annotators [NSY19][V].

### 2.7 Liszt, Tausig (and later Busoni) [T]
- Liszt's *Technische Studien* and Tausig's *Tägliche Studien*: exercises are transposed to all
  keys with **the same fingering**, which puts the thumb on black keys as a matter of course.
  Liszt's fingering is more about the arm and redistribution between the hands. He uses 1-3 and
  1-4 octave substitutions and repeated groups of 1-2-3 / 1-2-3-4 in chromatic runs [T][?].
- Busoni (*Klavierübung*) fingers by "groups" of notes that fit one hand position rather than by
  key [P97][V for transposition practice].

### 2.8 Theodor Leschetizky (via Malwine Brée, *Die Grundlage der Methode Leschetizky*, 1902) [T]
- Hand shape is built around a stable arch. Repeated notes use changing fingers (4-3-2-1 / 3-2-1).
  Scale passes are prepared early: the thumb moves under as soon as the previous note is played.
  Finger choice in chords follows the voicing.

### 2.9 Modern pedagogy [T]
- **Heinrich Neuhaus**, *The Art of Piano Playing* (1958; Eng. 1973), chapter on fingering: the
  fingering that gives the best musical result is the right one. He encourages unorthodox use
  (thumb on black, 5 on black, the same finger on two keys for a deliberate non-legato or accent)
  and recommends transposing for flexibility [N].
- **Tobias Matthay**, *The Act of Touch* (1903): forearm rotation and the weight behind each
  finger. Fingerings that keep rotation in one direction across a group feel easier [T].
- **György Sándor**, *On Piano Playing* (1981): five basic motions (free fall, five-finger,
  rotation, staccato, thrust). His chapter on "five-fingers, scales and arpeggios" covers the thumb,
  horizontal and vertical adjusting motions, shifting in arpeggios, note groupings and legato
  [S][V for TOC]. Fingering serves *groupings*: a position change belongs at a rhythmic or
  phrase boundary.
- **Alan Fraser**, *The Craft of Piano Playing* (Scarecrow 2003, 2nd ed. 2011): built on the hand's
  bone structure (an arch from the thumb's carpometacarpal joint, active knuckles). Long fingers go
  on black keys and the hand moves *into* the keys (towards the fallboard) when the outer notes
  are black, rather than twisting [F][T].
- **Otto Ortmann**, *The Physiological Mechanics of Piano Technique* (1929): finger dependence and
  arm motion, the source of the weak-4 argument [P97][V].

---

## 3. Concrete rules and standard fingerings

### 3.1 Scale fingerings, one octave ascending (descend in reverse) [WB][T, ABRSM/Clementi standard]
In a multi-octave run, the top-note finger in brackets is replaced by the continuing finger.
RH continuity: (5)→1 in the white-key group. LH continuity: the bottom note's 5 becomes 1 when
passing over.

**Majors**

| Key | RH | LH |
|---|---|---|
| C, G, D, A, E | 1 2 3 1 2 3 4 (5) | 5 4 3 2 1 3 2 1 |
| B | 1 2 3 1 2 3 4 (5) | 4 3 2 1 4 3 2 1 |
| F | 1 2 3 4 1 2 3 (4) | 5 4 3 2 1 3 2 1 |
| F♯ / G♭ | 2 3 4 1 2 3 1 2 | 4 3 2 1 3 2 1 4 |
| D♭ / C♯ | 2 3 1 2 3 4 1 2 | 3 2 1 4 3 2 1 3 |
| A♭ | 3 4 1 2 3 1 2 3 | 3 2 1 4 3 2 1 3 |
| E♭ | 3 1 2 3 4 1 2 3 | 3 2 1 4 3 2 1 3 |
| B♭ | 2 1 2 3 1 2 3 4 (start 2, continuing finger 4) | 3 2 1 4 3 2 1 3 |

**Harmonic minors** (melodic minors mostly follow these. F♯, C♯ and B♭ melodic have variants; check
an ABRSM scale book.)

| Key | RH | LH |
|---|---|---|
| a, e, d, g, c | 1 2 3 1 2 3 4 (5) | 5 4 3 2 1 3 2 1 |
| b | 1 2 3 1 2 3 4 (5) | 4 3 2 1 4 3 2 1 |
| f | 1 2 3 4 1 2 3 (4) | 5 4 3 2 1 3 2 1 |
| f♯ | 3 4 1 2 3 1 2 3 | 4 3 2 1 3 2 1 4 |
| c♯ | 3 4 1 2 3 1 2 3 | 3 2 1 4 3 2 1 3 |
| g♯ | 3 4 1 2 3 1 2 3 | 3 2 1 4 3 2 1 3 |
| e♭ / d♯ | 3 1 2 3 4 1 2 3 | 2 1 4 3 2 1 3 2 |
| b♭ | 2 1 2 3 1 2 3 4 | 2 1 3 2 1 4 3 2 |

**Rules that generate the table** (useful as a test oracle) [MIA][V]:
- Each hand uses 4 **exactly once per octave**, and the rest of the fingering follows from where
  4 falls. Groups alternate 1-2-3 / 1-2-3-4, so the pattern repeats every octave [SC][V].
- White-key tonics C, D, E, G, A: RH 4 on degree 7, LH 4 on degree 2.
- F: RH 4 on B♭ (degree 4), LH 4 on G. Flat keys: RH 4 on B♭. LH 4 on the 4th degree in B♭, E♭,
  A♭ and D♭ (e.g. E♭ in B♭ major), and on G♭ in G♭ major. Sharp black-key tonics: RH 4 on A♯ and
  LH 4 on F♯ for B, F♯ and C♯ [SCR][V].
- **The thumb never plays a black key** in any standard scale. It always plays the white key next
  to a black key where it can, so thumb passes happen black→white.
- In B, F♯ and D♭ majors both thumbs play together (in parallel motion). In C major the 3rd
  fingers play together [OU][V].
- Modes and other scales (Wikibooks lists all church modes per tonic) follow the same rules: thumb
  on white keys after black keys, and one group of 1-2-3 plus one of 1-2-3-4 per octave [WB][V].

### 3.2 Chromatic scale [T]
- **Standard (1-3)**: 3 on every black key and 1 on white keys. Where two white keys are adjacent
  (E-F, B-C), use 1-2 in the RH ascending (E1 F2, B1 C2) and 2-1 in the LH ascending (E2 F1, B2 C1).
  RH from C: `C1 C♯3 D1 D♯3 E1 F2 F♯3 G1 G♯3 A1 A♯3 B1 C2`.
  LH from C ascending: `C1 C♯3 D1 D♯3 E2 F1 F♯3 G1 G♯3 A1 A♯3 B2 C1`.
- **Fast "group" fingerings** (1-2-3 / 1-2-3-4 patterns, thumbs on F and C, or on E and B): fewer
  thumb passes, used for speed (Liszt, Czerny, Busoni) [?]. Several variants exist.
- **Outer-finger chromatic legato** (Chopin Op. 10/2): 3-4-5 with 3-over-4 and 4-over-5 crossings
  and slides. Use only when 1-2 are busy.

### 3.3 Arpeggios, two octaves [MIA][V][T]
- **Root-position major and minor triads on white-key roots**: RH `1 2 3 1 2 3 5`. LH uses
  `5 4 2 1 4 2 1` when the gap from root to third is small and the second gap is large (C, F, G
  major; a, d, e minor). LH uses `5 3 2 1 3 2 1` when the third is a black key (A, D, E major) or
  a wider stretch makes 4 awkward [MIA][V].
- **4 vs 3 choice rule** (taught universally): in a 4-note span where the interval *between the 3rd
  and 4th fingers' notes* is a 4th rather than a 3rd, use 4 on the closer note (RH) so the larger gap
  falls between 4/3 and the thumb. Equivalently: put **4 where the note before the thumb pass is
  close to the previous one**.
- **Inversions** (C major RH): 1st inversion `1 2 4 1 2 4 5`, 2nd inversion `1 2 4 1 2 4 5`.
  LH 1st inv `5 4 2 1 4 2 1`, 2nd inv `5 3 2 1 3 2 1` [MIA][V].
- **Black-key roots** (D♭, E♭, A♭, F♯ majors etc.): **the thumb takes the first white key**, and
  the start finger is whatever lands on the root once the thumb is fixed. E.g. A♭ major RH
  `2 1 2 4 1 2 4`, LH `2 1 4 2 1 4 2` [T]. F♯ major and e♭ minor (all black keys): RH `2 3 1 2 3 1 2`
  or `1 2 3 1 2 3 5` with the thumb on black [T][?].
- **Dominant 7th and diminished 7th** (four notes per octave): RH `1 2 3 4 1 2 3 4 5`,
  LH `5 4 3 2 1 4 3 2 1`. The thumb goes on white keys where possible, so the start finger rotates
  for black-key roots [T].

### 3.4 Broken chords, accompaniment figures [T]
- Alberti bass C-G-E-G: LH `5 1 3 1`. Hold the position and don't cross. Finger pedalling (§3.13)
  is common here.
- Closed broken-chord figures inside one position: fingers follow the chord fingering
  (C-E-G-C RH 1-2-3-5, LH 5-4-2-1). For triads in close position, RH 1-3-5 and LH 5-3-1 are the
  defaults. For 1st inversion RH 1-2-5, for 2nd inversion RH 1-3-5. For 4-note chords use 1-2-3-5
  or 1-2-4-5 depending on the gap: the largest gap goes between 1 and 2 [T].
- Wide arpeggiated left-hand figures (Chopin nocturnes) use thumb-on-black and 1-2-1 pivots freely.
  Here the pedal provides the legato.

### 3.5 Octaves [LP][PTP][W][SE][V]
- **Default: 1-5 on every octave** (forearm or wrist staccato octaves, maximum stability).
- **1-4 on black-key octaves** and 1-5 on white keys. Bernard Wolff's octave studies lists
  "1-5 for all octaves" and "1-4 for octaves on the black keys" as the two standard options [W][V].
  The mix also shares the load in fast octaves [LP][V].
- **Legato octaves**: alternate the upper (RH) finger 5-4 or 5-4-3 (large hands) while the thumb
  slides or plays non-legato. Silent substitution 5→4 on a held key gives full legato [SE][PM][V].
- **1-3 octaves** for legato inside octave passages, or at the extreme ends of the keyboard.
  Mentioned for Chopin and Liszt. Only works for large hands [SE][V].

### 3.6 Double thirds and sixths [SE][DPH][T]
- **Thirds, RH C major (common)**: lower notes `1 2 3 1 2 1 2 (1)`, upper notes `3 4 5 3 4 3 4 (3)`,
  i.e. `13 24 35 13 24 13 24 | 13` [T][?]. A simpler variant repeats 13/24/35 every three thirds
  [SE][V]. Both use a thumb pass in the lower voice and 3-over-4/5 in the upper voice.
- **Chromatic thirds** have several historic fingerings (Czerny, Chopin, Moszkowski, Godowsky,
  Joseffy) [SE][V]. A leaner reference: Dohnányi's principles (Wheaton handout) [DPH].
- **Sixths**: lower voice 1 throughout (non-legato), or 1-2 alternating on small intervals. Upper
  voice 4 on black and 5 on white, or 3-4-5 alternating for legato. Legato sixths pair the lower
  voice 1-1-2 with the upper 4-5-5 (large hands).

### 3.7 Repeated notes [SE][T]
- **Slow or cantabile**: the same finger is fine and often preferred for tone control.
- **Fast**: change fingers, 4-3-2-1 or 3-2-1 (descending order towards the thumb is standard in the
  RH). With three fingers, "one finger can be on the way down while another is on the way up"
  [SE][V].
- Some contexts alternate the hands, or use 1-2 / 2-3 pairs. There is "no definitive fingering"
  [SE][V].
- Parncutt's model forbids the same finger on two consecutive *different* notes. It allows (scores
  0) the same finger on a *repeated* note [P97][V].

### 3.8 Trills [T][SE]
- **Strong and even**: 1-3, 2-4, 2-3, 1-2 (1-2 is the fastest when neither key is a black-key/thumb
  problem).
- **3-5 and 2-4** when 1 or 2 must hold another voice. 3-4 and 4-5 are avoided except in double
  trills or when other fingers are busy (Beethoven and Chopin late works).
- **Black-key trills**: put long fingers on black (e.g. 2-3 on E-F♯ rather than 1-2).
- Trill fingerings can change mid-trill to rest the fingers (1-3 → 2-3), or you can use three
  fingers (1-2-3).
- Double-third trills: lower 1-2 / 3-2, upper 3-5 / 5-4 [SE][V].

### 3.9 Crossings: which are allowed [P97][T]
Parncutt Table 1 implies (for the RH, with the LH mirrored):

| Crossing | Allowed range (st, rising = thumb under going up) | Use |
|---|---|---|
| 1 under 2 (2→1 up) | up to 5 | very common (2-1-2 pivots) |
| 1 under 3 (3→1 up) | up to 4 | **the** scale pass |
| 1 under 4 (4→1 up) | up to 3 | common (scales, 4-note groups) |
| 1 under 5 | not in table (MinPrac 1-5 = –1) | essentially never |
| 2/3/4 over 1 (descending) | same distances | standard descending pass |
| 3 over 4, 4 over 5, 2 over 3 | not modelled (MinPrac > 0) | rare: legato double notes, Chopin chromatic, Couperin-style 3-4 pairs |
| 5 over anything | — | avoid |

- Thumb passes are cheapest **black (finger) → white (thumb)** and dearest **white (finger) → black
  (thumb)** (§1.4).
- Crossing 3 over 4 is historically normal (Couperin, C.P.E. Bach) but modern practice treats it as
  a special technique.

### 3.10 Thumb and 5 on black keys [P97][V]
- Avoided in general, especially in fast passages, the bass, and runs where the next note is white.
- The cost depends on context. **Thumb on black is cheap if neighbours are also black**, because
  the hand is already "in" the keys (e.g. D♭-B♭ played 1-5 costs 1 point; D♭-B 1-5 costs 3).
- Accepted uses: all-black passages (pentatonic, F♯/E♭-minor arpeggios), Liszt/Tausig fixed-fingering
  transposition, Chopin legato slides, octaves (1-4 on black).

### 3.11 Long fingers on black keys [P97][PTP][V]
Fingers 2, 3 and 4 reach black keys without moving the hand forwards. Chopin's E-F♯-G♯-A♯-B
position is the ideal. "4 on a black key after 3 on a white key" is an extra difficulty
(Four-on-Black rule) [P97][V].

### 3.12 Finger substitution [WIKI-FS][V][NSY19][V]
- Changing fingers on a held key without re-striking ("silent substitution") prepares the hand for
  what follows and keeps legato. Common in organ playing, polyphonic Bach, chorales and legato
  octaves.
- Notation is `4-3` or `4–3` above one note, or a slur between the two digits.
- It is rare in practice: **0.34% of notes** in the PIG dataset [NSY19][V].

### 3.13 Hand position, extension and contraction ("position principle") [P97][S][T]
- **Positions**: a 5-finger position covers 5 adjacent white keys (or wider in extended positions,
  e.g. C-D-F♯-G♯-A♯ = "weitere Lage", Kullak 1876) [P97][V].
- Position changes: **full change** = thumb pass. **Half change** = rotation over a finger other
  than the thumb, or an "insertion" (a jump, or the same finger on a new key) [P97][V].
- Put changes at beat or phrase boundaries, in gaps (rests, staccato) or during long notes
  [S][T].
- **Finger pedalling (overholding)**: holding notes of a broken chord beyond their written length to
  create resonance (Alberti basses, harp-like arpeggios). It only works with a fingering that stays
  in one position.

### 3.14 Spans per finger pair (Parncutt et al. 1997, Table 1, RH, semitones) [P97][V]
Positive = rising from the first finger to the second. Negative = thumb under or fingers over.

| Pair | MinPrac | MinComf | MinRel | MaxRel | MaxComf | MaxPrac |
|---|---|---|---|---|---|---|
| 1-2 | -5 | -3 | 1 | 5 | 8 | 10 |
| 1-3 | -4 | -2 | 3 | 7 | 10 | 12 |
| 1-4 | -3 | -1 | 5 | 9 | 12 | 14 |
| 1-5 | -1 | 1 | 7 | 10 | 13 | 15 |
| 2-3 | 1 | 1 | 1 | 2 | 3 | 5 |
| 2-4 | 1 | 1 | 3 | 4 | 5 | 7 |
| 2-5 | 2 | 2 | 5 | 6 | 8 | 10 |
| 3-4 | 1 | 1 | 1 | 2 | 2 | 4 |
| 3-5 | 1 | 1 | 3 | 4 | 5 | 7 |
| 4-5 | 1 | 1 | 1 | 2 | 3 | 5 |

- **LH**: reverse the order of the pair (e.g. 1-2 becomes 2-1), or negate all entries and swap Min
  and Max. **Reverse pair y-x**: negate and swap (MaxPrac(2-1) = 5) [P97][V].
- MaxComf = MaxPrac – 2 for all pairs [P97][V].
- The authors flag semitones as an approximation and suggest millimetres instead. An octave is about
  165 mm, i.e. 13.7 mm per semitone on average [P97][V]. Jacobs (2001) refined the model on these
  lines: physical distance instead of semitones, plus revised finger-strength assumptions [J01][V].

### 3.15 Hand size [PASK][V]
- 473 adult pianists: **mean 1-5 span 22.6 cm (8.9") for males, 20.1 cm (7.9") for females** [PASK][V].
- Span thresholds for white-key intervals [PASK][V]:

| 1-5 span | Octave (12 st) | 9th (13–14 st) | 10th (15–16 st) | 11th (17 st) |
|---|---|---|---|---|
| 17.0 cm / 6.7" | on the edge | — | — | — |
| 19.3 cm / 7.6" | minimal comfort | on the edge | — | — |
| 21.6 cm / 8.5" | relaxed | minimal comfort | on the edge | — |
| 23.9 cm / 9.4" | relaxed | relaxed | minimal comfort | on the edge |

- Parncutt's 1-5 MaxPrac of 15 st (a minor 10th) matches a hand of about 22 cm. Use it as the
  "average" default and scale it for small and large hands.
- Acclaimed soloists tend to have larger spans: 9 of 12 internationally acclaimed pianists had a 1-5
  span of at least 23.6 cm [PASK][V].

### 3.16 Redistribution between hands, crossing hands, glissando [T]
- **Redistribution**: give notes to the other hand when one hand is overloaded (wide spans, fast
  leaps). Editions show it with `m.d.` / `m.s.` or brackets. It is only an option when the other
  hand is free.
- **Hand crossing** (Scarlatti, Mozart K. 545 variations): the crossing hand passes over (usually
  the LH over the RH) and is fingered as an independent short position.
- **Glissando**: RH up with the nail of 3 (or 2-3 together) and down with the outside of the thumb.
  LH down with 3 and up with the thumb. Black-key glissandos use the flat fingers or the palm.

### 3.17 Phrasing and articulation [E][S][T]
- A new phrase or slur can start on a fresh position. The fingering need not connect across a
  breath.
- Staccato and detached notes allow jumps and the same finger on consecutive keys (no legato cost).
- Legato needs a connected fingering (no same-finger glide except black→white slides). Otherwise
  the pedal has to provide the legato.
- Accents and melody notes go to strong fingers (3, sometimes 1). Voicing in chords uses 5 or 4
  for the top voice.
- Fast passages favour group fingerings (fewer thumb passes, Busoni groups). Slow cantabile passages
  favour tone (same finger allowed, substitution, avoiding 4 on important notes).

### 3.18 Editorial conventions [T][HOOK][V]
- Numbers 1–5 above the RH notes and below the LH notes. Stacked numbers on a chord list the fingers
  bottom-to-top. Alternatives go in parentheses or a second row.
- `4-3` (or `4⌒3`) on one note = substitution. `3 2 1` under a repeated note = changing fingers.
- **Hands**: `m.d.` / `m.s.` (Italian *mano destra/sinistra*), `m.d.` / `m.g.` (French *main
  droite/gauche*), `r.H.` / `l.H.` (German), `R.H.` / `L.H.` (English).
- **"English fingering"** (`+` for the thumb, then 1–4 for the fingers) was used in British editions
  until about 1900. Hook's *Guida di musica* (c.1785) prints `+` for the thumb [HOOK][V].
  "Continental" (1–5) fingering is now universal. Watch for this in old scores.
- Urtext editions keep only the composer's fingerings (Chopin, Brahms, Bartók). Editorial
  fingerings (Bülow, Cortot, Paderewski, Henle editors) often differ a lot. That is useful for
  measuring disagreement.

---

## 4. Ergonomic facts

| Fact | Value / statement | Source |
|---|---|---|
| White key width | ≈ 23.5 mm at the front; octave 164–165 mm | [MK][SE-K][V] |
| Average semitone | 13.7 mm (but irregular: E-F, B-C = one white key) | [P97][V] |
| Black key | ≈ 12 mm wide (15/32" at base, 7/16" at top), ≈ 92–100 mm long, top about 6 mm above the white key level in one technician spec (other sources put it at ≈ 12 mm) | [SE-K][V][?] |
| Black keys sit further back | the hand must move *into* the keys (distally) to reach them with 1 or 5, so the thumb on black moves the whole hand inward | [P97][F][V] |
| Key leverage | black and white keys have offset fulcra; they sound evenly only if each is played at its optimal point, which is another reason to keep 1 and 5 off black keys (most acute in the bass) | [P97][V] |
| Finger independence | thumb, index and little finger are the most individuated; middle and ring the least (Häger-Ross & Schieber 2000) | [HRS][V] |
| 3-4-5 coupling | juncturae tendinum link the extensor tendons of 3-4-5. Lifting 4 while 3 is down is hard, hence 3→4 is harder than 4→3 | [P97][HRS][T] |
| Finger length | 3 > 4 ≈ 2 > 5 > 1 (the thumb is much shorter and works sideways from its carpometacarpal joint, which is what makes thumb-under possible) | [T] |
| Asymmetric transitions (Czerny sight-reading) | 4-3 > 3-4 (+45%); also 3-1 > 1-3, 1-4 > 4-1, 3-2 > 2-3, 2-4 > 4-2, 5-4 > 4-5 | [P97][V] |
| Contraction vs extension | finger adduction is easier than abduction, so tight spans (below MinRel) are easier than wide ones | [P97][V] |

---

## 5. Existing computational models (for calibration)

- **Parncutt et al. 1997**: an ergonomic cost model for monophonic RH fragments. Generate all
  fingerings within the MaxPrac spans, then score them with the 12 rules below. Tested against
  pianists' fingerings of Czerny studies: most of the pianists' fingerings were among the model's
  cheapest, but the model also predicted many that pianists did not use [P97][V].
- **Jacobs 2001**: refinements to Parncutt et al.: distances in physical units, and rules revised
  to reflect modern teaching on finger strength and on notes that are far apart [J01][V].
- **Nakamura, Saito & Yoshii 2019 (PIG dataset)**: 150 pieces and 309 fingering files
  (≈100k notes); 2nd/3rd-order HMMs are state of the art; Mgen 64.5% vs human 71.4%; Msoft 85.5%
  vs 90.8% [NSY19][V]. The HMMs ignore phrase boundaries and the interdependence of the two hands
  [NSY19][V]. Use PIG as the test corpus.
- Parncutt's 12 rules, verbatim summary [P97][V]:
  1. **Stretch**: 2 points per st beyond MaxComf or below MinComf.
  2. **Small-Span**: below MinRel, 1 point per st for thumb pairs and 2 points per st for other pairs.
  3. **Large-Span**: above MaxRel, 1 point per st for thumb pairs and 2 points per st for other pairs.
  4. **Position-Change-Count**: over three notes, 2 points for a full change and 1 for a half change.
     A change happens when notes 1→3 span more than MaxComf or less than MinComf for fingers f1-f3.
     It is a full change if the middle finger is the thumb, the middle pitch lies between, and
     the span is beyond MaxPrac or MinPrac.
  5. **Position-Change-Size**: |span(1→3) − MaxComf or MinComf| points.
  6. **Weak-Finger**: 1 point per use of 4 or 5.
  7. **Three-Four-Five**: 1 point whenever 3, 4 and 5 occur consecutively (any order).
  8. **Three-to-Four**: 1 point for 3 immediately followed by 4.
  9. **Four-on-Black**: 1 point for 3 and 4 consecutive (either order) with 3 on white and 4 on black.
  10. **Thumb-on-Black**: 1 point, +2 if the previous note is white, +2 if the next note is white.
  11. **Five-on-Black**: 0 if both neighbours are black, +2 if the previous note is white, +2 if the
      next note is white.
  12. **Thumb-Passing**: 1 point for a same-level pass (white-white or black-black). 3 points when a
      non-thumb finger plays a lower white key and the thumb plays an upper black key.

---

## 6. Implications for an algorithm

Design: dynamic programming / Viterbi over per-note (or per-chord) finger states, separately per
hand, with costs = Σ weighted rules. Hand size enters as a scale factor on all span limits. Tempo
and articulation scale context-dependent costs. Parameters below are starting points: tune them on
PIG (agreement with *any* annotator, Msoft/Mrec-style), then sanity-check against the oracles.

### 6.1 Hard constraints (infinite cost)
| ID | Rule | Parameter |
|---|---|---|
| H1 | Span between consecutive fingers outside [MinPrac, MaxPrac] × handScale | Table 3.14; handScale 0.85 (small, 19 cm) / 1.0 (22 cm) / 1.12 (24 cm) |
| H2 | Same finger on two different simultaneous notes | — |
| H3 | Chord: fingers must be in pitch order (RH ascending 1→5, LH 5→1) | allow 1 on two adjacent white keys only as a special state (Chopin) |
| H4 | Chord span 1-5 > MaxPrac(1-5) | 15 st default; 12 st small hand; 17 st large |
| H5 | 5 crossing under/over any finger, 1 under 5 | — |

### 6.2 Soft costs between consecutive notes (monophonic line)
| ID | Rule | Suggested cost |
|---|---|---|
| S1 | Stretch beyond MaxComf / below MinComf | 2 per st (Parncutt) |
| S2 | Below MinRel | 1 per st (thumb pair), 2 (other) |
| S3 | Above MaxRel | 1 per st (thumb pair), 2 (other) |
| S4 | Thumb under 2 / 3 / 4 (rising RH, falling LH) | base 1 / 0.5 / 1, plus S1–S3 |
| S5 | Pass level: finger black → thumb white / white-white / black-black / finger white → thumb black | 0 / 1 / 1.5 / 3 (+ thumb-on-black cost) |
| S6 | Non-thumb crossing 3-over-4, 4-over-5, 2-over-3 | 6–8 (allowed only in legato double notes / slow passages); 4-over-5 8+ |
| S7 | Same finger, different keys (glide/jump) | 0 if a rest/staccato precedes (gap ≥ ½ beat) or slow tempo; 2 for a black→white slide; 6 for legato otherwise |
| S8 | Same finger on a repeated note | 0 below ~6 notes/s; then rising linearly to 3 at 10 notes/s; prefer descending 4-3-2-1 / 3-2-1 (cost 0) |
| S9 | Weak finger use (4, 5) | 1 per use (Jacobs-style: 0.5 for 5, 1 for 4) |
| S10 | Three-Four-Five consecutive | 1 |
| S11 | 3→4 transition | 1; 4→3 0 |
| S12 | 3/4 adjacent with 3 white, 4 black | 1 |
| S13 | Thumb on black | 1 base, +2 per white neighbour; ×0.5 when tempo is slow or legato is pedalled; ×1.5 in the bass (below C3) |
| S14 | 5 on black | 0 base, +2 per white neighbour |
| S15 | Long finger (2, 3, 4) on black / short finger (1, 5) on white | bonus –0.25 (implements Chopin's natural position) |
| S16 | Asymmetry bonuses (observed preferences) | 3-1 vs 1-3, 1-4 vs 4-1, 3-2, 2-4, 5-4: –0.2 each |

### 6.3 Three-note / position costs
| ID | Rule | Suggested cost |
|---|---|---|
| P1 | Full position change (thumb pivot) | 2 |
| P2 | Half change (rotation / insertion / jump) | 1 |
| P3 | Size of the change beyond MaxComf / MinComf | 1 per st |
| P4 | Position change at a phrase/slur/beat boundary or after a rest | ×0.3 discount |
| P5 | Position change in the middle of a slur on short notes | ×1.5 |
| P6 | Thumb pass immediately before a large leap | +1 (the hand cannot prepare) |

### 6.4 Chords, double notes, polyphony
| ID | Rule | Suggested cost |
|---|---|---|
| C1 | Gap between adjacent chord fingers vs relaxed span | use S2/S3 with Table 3.14 within the chord |
| C2 | Largest gap not between 1-2 (RH chords) | 1 |
| C3 | Octave: 1-5 white / 1-4 black-top / 1-3 | 0 / 0 (1-4 on black also allowed on white: 0.5) / 2 (×0 for large hands in legato) |
| C4 | Legato octave line: upper finger alternation 5-4(-3) | –0.5 bonus vs 5-5 under slur |
| C5 | Double thirds: standard 13/24/35 pattern | 0; other pairs +1 |
| C6 | Held note (sustained voice) blocks its finger; other fingers must fit the span | hard constraint + spans from held finger |
| C7 | Silent substitution on a held note | 3 (only when it unlocks a legato that is otherwise impossible; PIG shows 0.34% use) |
| C8 | Voicing: melody (top voice RH) on 4 or 5 in chords | 0 (preferred), 3 or 2 on top +0.5 |

### 6.5 Global / pattern costs
| ID | Rule | Suggested cost |
|---|---|---|
| G1 | Pattern consistency: repeated or transposed figure (same interval sequence) fingered differently | 1 per differing note (look-back window of 2 bars or 16 notes) |
| G2 | Scale template match: if a run matches a diatonic scale ≥ 6 notes, prefer the table 3.1 fingering | –0.5 per matching note |
| G3 | Tempo scaling | multiply S5, S6, S13, P1, P2 by (1 + 0.1·(notes/s − 4)) clamped to [0.6, 2.0] |
| G4 | Hand assignment (when the hand is not given) | cost 4 for a note taken by the "wrong" hand (pitch side); redistribution allowed when the other hand is idle for ≥ the note duration |
| G5 | Pedal active | ×0.5 on legato-only costs (S7, S6, P5) |

### 6.6 Test cases (oracles)
1. All 24 scales in §3.1, RH and LH, 2 octaves up and down. Expect an exact match. Also: 4 once per
   octave and no thumb on black.
2. Chromatic scale from every pitch, RH and LH. Expect 1 on white, 3 on black, 1-2 at E-F and B-C.
3. Root-position arpeggios C, G, F, A, E, D, B majors and a, d, e, c minors (RH 1231235;
   LH 5421421 or 5321321 per §3.3). Dominant 7th: RH 1234 1235.
4. Five-finger positions C-D-E-F-G (RH 1-5) and the Chopin position E-F♯-G♯-A♯-B (RH 1-5,
   LH 5-1). The algorithm must not insert a thumb pass.
5. Alberti bass C-G-E-G LH → 5-1-3-1.
6. Repeated note ×8 at 12 notes/s → 4321 4321 or 321 321 (accept either). At 2 notes/s → the same
   finger is acceptable.
7. Trill C-D ×16 → 1-3, 2-3 or 1-2; never 3-4 or 4-5. Trill E-F♯ → 2-3 (accept 1-3).
8. Octave scale in C major → 1-5 throughout. Octaves on F♯-G♯-A♯ → 1-4 accepted.
9. Wide leaps: C4 → G5 RH (19 st > 1-5 MaxPrac) must be a position change, not a stretch.
10. Pentatonic black-key run (F♯ G♯ A♯ C♯ D♯ ×2): the thumb on black is acceptable. Check that the
    cost doesn't explode (compare with Chopin's practice).
11. A sequence (e.g. Hanon No. 1 across an octave): the fingering repeats identically (G1).
12. Parncutt's examples: D4→C5 played 2-5 = 4 stretch points. C♯4→E4 played 1-2 = 3 points
    thumb-on-black. A♯3-C♯4-E4 played 2-1-2 = +1 thumb-pass. Use these to unit-test the rule
    implementations [P97][V].
13. PIG dataset: report Mgen, Mhigh and Msoft against all annotators. The target is close to the
    2nd-order HMM (≈64% Mgen, ≈85% Msoft); the human ceiling is ≈71% / 91% [NSY19][V].

---

## Sources

- [P97] Parncutt, Sloboda, Clarke, Raekallio, Desain (1997), "An ergonomic model of keyboard
  fingering for melodic fragments", *Music Perception* 14(4):341–382.
  PDF: https://static.uni-graz.at/fileadmin/_Persoenliche_Webseite/parncutt_richard/Pdfs/PaSlClRaDe97_FingeringModel.pdf
  (Table 1 and rules 1–12 extracted this session.)
- [J01] Jacobs, J.P. (2001), "Refinements to the ergonomic model for keyboard fingering of Parncutt,
  Sloboda, Clarke, Raekallio, and Desain", *Music Perception* 18(4):505–511.
  https://online.ucpress.edu/mp/article-pdf/18/4/505/563644/mp_2001_18_4_505.pdf
- [NSY19] Nakamura, Saito, Yoshii (2019/2020), "Statistical Learning and Estimation of Piano
  Fingering", *Information Sciences*; arXiv:1904.10237. https://arxiv.org/abs/1904.10237 (PIG dataset)
- [WB] Wikibooks, "Piano/Fingering" (traditional scale fingering for all keys and modes).
  https://en.wikibooks.org/wiki/Piano/Fingering
- [MIA] B. Rosenberg (Univ. of Miami), "Fingering charts" (4th-finger placement; arpeggio table).
  https://www.cs.miami.edu/home/burt/music/finger-charts.html
- [OU] Univ. of Oklahoma, "Scale & Arpeggio Fingerings for Piano (2 Octave)".
  https://canvas.ou.edu/courses/682/files/2201610/download?download_frd=1
- [SC] "Scale fingering" (123 1234 alternation). https://www.scribd.com/document/460948371/scalfing-pdf
- [SCR] "F Major Scale Finger Positioning Guide" (4 on A♯ RH / F♯ LH). https://www.scribd.com/document/475008832/3
- [CPE] C.P.E. Bach, *Versuch über die wahre Art das Clavier zu spielen* (1753); Eng. *Essay on
  the True Art of Playing Keyboard Instruments*, tr. W. Mitchell (1949). Fig. 1 discussion:
  https://casfaculty.case.edu/ross-duffin/muhi-3441-multimedia/articulation-examples/muhi-articulation-keyboard-c-p-e-bach/
- [C] F. Couperin, *L'art de toucher le clavecin* (1716/17), IMSLP:
  https://imslp.org/wiki/L'Art_de_toucher_le_clavecin_(Couperin,_Fran%C3%A7ois); Baroque fingering
  reconstruction: http://couperin.braybaroque.ie/
- D.G. Türk, *Klavierschule* (1789); M. Clementi, *Introduction to the Art of Playing on the Piano
  Forte* (1801) — both cited via [P97].
- [H] J.N. Hummel, *Ausführliche theoretisch-practische Anweisung zum Piano-Forte-Spiel* (1828).
  https://digital.library.unt.edu/ark:/67531/metadc948150/
- C. Czerny, *Vollständige theoretisch-practische Pianoforte-Schule* Op. 500 (c.1839), vol. 2.
- [E] J.-J. Eigeldinger, *Chopin: Pianist and Teacher as Seen by His Pupils* (CUP 1986) — contains
  the *Projet de méthode*.
- [PF] Piano Fantasy, "Chopin's B Major Scale". https://pianofantasy.com/blog/why-chopin-taught-scales-in-b-major
- [KN] Key-Notes, "Piano Hand Position". https://www.key-notes.com/blog/piano-hand-position
- M. Brée, *Die Grundlage der Methode Leschetizky* (1902); Eng. *The Groundwork of the Leschetizky
  Method* (1902).
- [N] H. Neuhaus, *The Art of Piano Playing* (1958; Eng. tr. K.A. Leibovitch, 1973).
- T. Matthay, *The Act of Touch in All Its Diversity* (1903).
- [S] G. Sándor, *On Piano Playing: Motion, Sound and Expression* (Schirmer 1981). TOC:
  https://archive.org/details/onpianoplaying0000unse
- [F] A. Fraser, *The Craft of Piano Playing* (Scarecrow 2003; 2nd ed. 2011).
  https://www.bloomsbury.com/us/craft-of-piano-playing-9798216245582/
- O. Ortmann, *The Physiological Mechanics of Piano Technique* (1929) — via [P97].
- [PASK] Boyle, Boyle & Booker (2015), "Pianist hand spans: gender and ethnic differences and
  implications for piano playing"; PASK summaries:
  https://paskpiano.org/pianists-hand-spans-australian-study/ and
  https://paskpiano.org/hand-span-versus-interval-reach/
- [HRS] Häger-Ross & Schieber (2000), "Quantifying the independence of human finger movements",
  *J. Neurosci.* 20(22):8542. https://www.jneurosci.org/content/20/22/8542
- [LP] Living Pianos, "How to Finger Octaves". https://www.livingpianos.com/articles/how-to-finger-octaves/
- [PTP] Practising the Piano, "Preparing to Play Octaves" / "A Practical Theory Lesson".
  https://practisingthepiano.com/preparing-to-play-octaves/
- [W] B. Wolff, *Octave Studies* (Schirmer), IMSLP:
  https://s9.imslp.org/files/imglnks/usimg/7/7b/IMSLP578100-PMLP930493-octavestudiesfor00wolf.pdf
- [PM] Pianist Magazine, "5 Top Tips for Developing Legato Octaves".
  https://www.pianistmagazine.com/5-top-tips-for-developing-legato-octaves/
- [SE] Music Stack Exchange threads: octaves https://music.stackexchange.com/questions/336/ ;
  thirds https://music.stackexchange.com/questions/74238/ ; chromatic thirds
  https://music.stackexchange.com/questions/75358/ ; repeated notes
  https://music.stackexchange.com/questions/16218/ ; double trills
  https://music.stackexchange.com/questions/33295/
- [DPH] D.P. Horn, "Fingerings for double thirds (based on Dohnányi)", Wheaton College.
  https://www.wheaton.edu/media/migrated-images-amp-files/media/files/academics/faculty/horn-dp/DPH-FINGERINGS-FOR-DBL-3RDS.pdf
- [WIKI-FS] Wikipedia, "Finger substitution". https://en.wikipedia.org/wiki/Finger_substitution
- [MK] Wikipedia, "Musical keyboard"; [SE-K] https://music.stackexchange.com/questions/20290/ and
  https://music.stackexchange.com/questions/53847/ (key dimensions).
- [HOOK] J. Hook, *Guida di musica* Op. 37 ("+" thumb notation). https://archive.org/details/guidadimusicabei00hook
- A. Fytika (2004), *A Historical Overview of the Philosophy Behind Keyboard Fingering Instruction
  from the Sixteenth Century to the Present*, FSU dissertation (secondary survey; not fetched).
