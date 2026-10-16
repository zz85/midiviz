# 01 — How violinists and violists choose fingerings: rules, traditions, geometry

This brief feeds the design of an automatic violin and viola fingering algorithm, which maps
MIDI pitches to string, finger (0 = open, 1 = index … 4 = little finger), position and shifts.
It also supplies the test cases for that algorithm. Strings are named by their open note (G, D,
A, E on the violin; C, G, D, A on the viola). Roman numerals follow the score convention:
I = highest string, IV = lowest.

- Spans are in semitones (st). The *anchor* `a` is the number of semitones above the open
  string at which finger 1 sits.
- Pitches use scientific notation with MIDI numbers (C4 = 60). The open strings are violin G3 55,
  D4 62, A4 69, E5 76, and viola C3 48, G3 55, D4 62, A4 69.
- Cell notation `A2@3` means: A string, finger 2, 3rd position.
- Source keys like [MY11] point to the list at the end.

Verification tags:
- [V] = checked against a source fetched this session.
- [T] = standard pedagogy (scale books, widely repeated) that was not individually re-fetched.
- [?] = plausible but needs checking.
- [calc] = computed in this brief from the formula in §1.3. It is exact for the stated input
  values.

---

## 0. Ten-line summary (what matters most for a cost model)

1. Fingering is chosen from two points of view. Technically it should follow "the rule that
   calls for a minimum expenditure of effort". Musically it should carry out the composer's
   intentions (Flesch) [KRU][V]. Yampolsky's test of a "rational fingering" is the one that needs
   the least movement of the hand while staying comfortable [MY11][V].
2. Prefer the position that covers the passage, so that shifts are few. "Unnecessary shifting
   should always be avoided" (Grove) [GRS][V]. Use 2nd and other even positions, and half
   position, to save shifts between 1st and 3rd [GRS][MY11][V].
3. Keep a melodic segment on one string for uniform timbre. L. Mozart, Yampolsky, Flesch and
   Galamian all say so [MY11][GRP][V]. Do not cross to a new string for just one note; shift
   instead [MY11][KRU][V].
4. Hide shifts. Place them on a semitone, on a change of finger, on a bow change, on an open
   string or a harmonic, after a longer note, or at a rhythmic group boundary [PHI][MY11][KRU][AUE][V].
5. In chromatic passages use a different finger per semitone (the "newer" fingering, with no
   half-step slides). Both Flesch and Galamian prefer it in their treatises [MY11][V]. The older
   sliding fingering 1-1-2-2-3-3 is still taught as an alternative [SCH][VC1][V].
6. Avoid open strings on long, expressive or strong-beat notes, because they cannot take vibrato
   [WV][MY11][KRU][V]. Open strings are fine in fast passages and as shift points. Ascending
   lines use the open string and descending lines prefer the 4th finger (Schroeder) [SCH][V].
7. Avoid the *oblique crossing*: the same finger moving to an adjacent string at a different
   fingerboard spot (any interval except a perfect fifth). Yampolsky, Flesch and Galamian all
   avoid it [MY11][V]. A perfect fifth, by contrast, is taken with one finger lying across both
   strings [MY11][V].
8. Repeated notes in a lyrical line change finger [MY11][V]. Use the same finger for the same
   pattern (parallel fingering) [MY11][V].
9. The normal hand frame is a perfect fourth from finger 1 to finger 4. An augmented fourth is
   possible, and extensions or contractions go beyond it [MY11][DAK][WV][V]. The frame
   shrinks in millimetres as the hand goes up the string (Galamian) [STS][V].
10. Hand size moves the optimum. Smaller hands shift where larger hands stretch (Flesch vs
    Galamian, per Myers) [MY11][V]. Violists stretch less and use half position and
    enharmonic re-fingering more [VSM][VAF][V].

---

## 1. Instrument geometry

### 1.1 Tuning and strings [WV][WVA][V]
| Instrument | Strings (low → high) | MIDI | String numbers |
|---|---|---|---|
| Violin | G3 D4 A4 E5 | 55 62 69 76 | IV III II I |
| Viola | C3 G3 D4 A4 | 48 55 62 69 | IV III II I |
| Cello (contrast) | C2 G2 D3 A3 | 36 43 50 57 | — |

The viola sits exactly a fifth below the violin and shares three strings with it (G, D and A).
The cello sits an octave below the viola [WVA][V]. Every violin note above open D can be played
on more than one string. Open A, for example, can be played open, on the D string in positions
1–4, or on the G string in positions 6–9 [WV][V].

### 1.2 String lengths and body sizes
| Item | Value | Source |
|---|---|---|
| Violin vibrating string length (nut–bridge), average | 325–328 mm | [STL][V] |
| Stradivari / Guarneri / Stainer violin scale | 12.8 in (325 mm) | [WSL][V] |
| Fractional violin scale: 7/8, 3/4, 1/2, 1/4 | ≈317, 307, 287, 267 mm | [WSL][V] |
| Violin body (4/4, 3/4, 1/2) | 356, 335, 310 mm | [WV][V] |
| Other fractional violins | 1/8, 1/10, 1/16, 1/32, 1/64; sizes are "not literal proportions" | [WV][V] |
| Viola body | 38–46 cm, average ≈41 cm; children's from ≈30 cm | [WVA][V] |
| Viola nominal sizes | 17, 16½, 16, 15½, 15, 14, (12) in; no standard scale length | [WSL][V] |
| Viola vibrating string length | "on average 37–38 cm"; no fixed body/string ratio | [STL][V] |
| Viola string makers' design length (Dominant 16–17") | 38 (39.5) cm | search snippet only [?] |
| Cello string length | ≈70 cm (Thomastik reference); Strad scale 27.4 in | [STL][WSL][V] |
| Strad viola 1723 (Vidal) body | 16 3⁄16 in | [SCH][V] |
| Tertis's Montagnana viola / Tertis Model | 17⅛ in / 16¾ in | [WTE][V] |
| Primrose's description | viola "on an average about two inches longer than the violin" | [BYU][V] |

The often-quoted 365–420 mm envelope for violas is plausible. The
sources fetched only give the 37–38 cm average and say that no standard exists [STL][V]. Use
**L = 328 mm for the violin and L = 375 mm for the viola** as defaults, and expose L as a
parameter.

### 1.3 Fret formula and finger spacing [calc]
A stop n semitones above the open string lies at distance `d(n) = L·(1 − 2^(−n/12))` from the
nut. The gap between neighbouring stops n and n+1 is `L·2^(−n/12)·(1 − 2^(−1/12))`, about
5.6 % of the remaining length.

| n (st) | 1 | 2 | 5 | 7 | 12 | 17 | 19 | 24 |
|---|---|---|---|---|---|---|---|---|
| violin d(n), L=328 | 18 | 36 | 82 | 109 | 164 | 205 | 219 | 246 |
| viola d(n), L=375 | 21 | 41 | 94 | 125 | 188 | 235 | 250 | 281 |
| cello d(n), L=690 | 39 | 75 | 173 | 229 | 345 | 432 | 460 | 518 |

Width of the finger 1 → finger 4 perfect-fourth frame (mm), by anchor a (finger 1 at a, finger 4
at a+5):

| a | 1 (½ pos) | 2 (1st) | 5 (3rd) | 7 (4th) | 12 (7th) | 17 (10th) | 19 (11th) |
|---|---|---|---|---|---|---|---|
| violin 328 | 77.7 | 73.3 | 61.6 | 54.9 | 41.1 | 30.8 | 27.5 |
| viola 375 | 88.8 | 83.8 | 70.5 | 62.8 | 47.0 | 35.2 | 31.4 |
| viola 395 (17") | 93.5 | 88.3 | 74.2 | 66.1 | 49.5 | 37.1 | 33.1 |
| cello 690 (1→4 = m3 only: 3 st) | — | 97.8 | — | — | — | — | — |

Consequences [calc]:
- The violin semitone shrinks from 18.4 mm at the nut to 9.2 mm at the octave and 4.6 mm at two
  octaves.
- An average viola frame in 1st position (84 mm) is wider than any violin frame. It roughly
  equals a violin 1st-position frame with a half-step extension (a 6-st span from a=2 is
  ≈85 mm).
- On the viola the frame only drops to the violin's 1st-position width (≈73 mm) at about
  a = 4–5, i.e. 2nd–3rd position. So a "normal" perfect-fourth frame in viola 1st position
  carries the strain of a violin extension. This is the physical basis of §9.
- Model reach in millimetres, not semitones. Allowed span = f(hand size, L, a).
- Galamian: the hand shape "should remain basically the same, at least to the sixth or seventh
  position. The frame of the hand … will become gradually smaller as the string length shortens"
  [STS][V].

### 1.4 Range per string and top positions
- Violin lowest note: G3. E7, two octaves above the open E, is "a practical limit for orchestral
  violin parts". Higher notes up to C8 come from the end of the fingerboard or from artificial
  harmonics [WV][V].
- Violinists "may easily play more than two octaves on a single string". Positions above 7th are
  rarely named, and the "highest position, practically speaking, is 13th" [WV][V].
- Grove (P. David): "Eleven different positions exhaust all capabilities of the violin", covering
  G3 to E7. "Positions above the seventh are but rarely employed", and higher notes are reached
  by extension or taken as harmonics [GRP][V].
- Suggested per-string caps for the search space [T]:

| String | Typical max (orchestral) | Solo max |
|---|---|---|
| Violin E | E7 (88) | ~A7 |
| Violin A, D, G | about 7th–8th position: violin A ≈ E6/A6; D ≈ A5/D6; G ≈ D5/G5 (sul G solos go to 10th+) | — |
| Viola | ≈ a fifth lower; A string ≈ E6–A6 in solo repertoire [?] | — |

---

## 2. Positions, frames and finger patterns

### 2.1 Naming
- The position is named after the place reached by finger 1: "each is determined by the place
  reached by the first finger" (Schroeder) [SCH][V].
- 2nd position: finger 1 takes the place of finger 2 in 1st position. 3rd position: finger 1
  takes the place of finger 3, and so on [WV][GRP][V].
- Positions are *diatonic* and keep their names when notes are sharpened or flattened: "The
  positions retain their names when the notes are sharpened or flattened a semitone" [SCH][V].
- A programmer's warning (violinist.com, author of a fingering program): "the position starting
  on F on the D string is not really the same position as the one starting on F#". The program
  works internally with "E-position, F-position, F#-position", i.e. a semitone anchor [VAF][V].
  **Recommendation:** use the integer anchor `a` internally and derive the name only for display.

| Position | Anchor a of finger 1 (st above open) | Example on violin A string |
|---|---|---|
| half | 1 | B♭4 |
| 1st | 2 (low-1 = 1) | B4 |
| 2nd | 3–4 | C5/C♯5 |
| 3rd | 5 | D5 |
| 4th | 7 (6) | E5 |
| 5th | 8–9 | F5/F♯5 |
| 6th | 10 (11) | G5 |
| 7th | 12 | A5 |
| 8th | 13–14 | B♭5/B5 |
| 9th | 15–16 | C6/C♯6 |
| 10th | 17 | D6 |
| 11th | 19 | E6 |
| 12th | 20–21 | F6/F♯6 |

The 1st–7th rows match the Tunable chart attributed to Galamian's *Principles* [TUN][V]. Higher
rows are [T] by extension of the same rule.

- **History.** Corrette (1738) divided the fingerboard into seven positions [MY11][V].
  L. Mozart (1756) treated odd positions as "whole" and even positions as "half" positions
  [MY11][VAF][V]. In whole positions, notes on G-clef lines take fingers 1 and 3 and notes in
  spaces take 2 and 4; half positions reverse this [VAF][V].
- **Grove names.** 2nd position = "half shift", 3rd = "whole shift", 4th = "double shift" [GRS][V].
- **Half position** ("Sattel-Lage", nut position or back-shift) puts finger 1 a semitone above
  the open string [SCH][GRP][V]. L'Abbé (1761) is the first known source to discuss it
  [MY11][V]. Wikipedia: since the thumb usually stays put, it "is better thought of as a
  backwards extension of the whole hand" [WV][V]. Flesch and Galamian both treat it as a true
  shift [MY11][V].

### 2.2 The frame and the four finger patterns
- **The frame.** Szigeti's "natural" left-hand position is "the interval of a perfect fourth
  between the first and fourth fingers" (summary in [MY11][V]). Strings are a fifth apart, so
  finger 4 on one string sits a semitone below the next open string. A stopped octave across two
  strings is fingers 1-4: the "octave frame" [WV][V]. Kruse: "shift rather than stretch beyond
  the perfect 4th hand frame … particularly in lower positions" if hands are small [KRU][V].
- **Yampolsky's natural position** has the semitone between fingers 2 and 3 [MY11][V].
  Rolland's argument for teaching pattern 1 first has 2-3-4 a half step apart at rest [DAK][V].
- **Four basic patterns** cover all major, natural-minor and melodic-minor sequences in any
  position [DAK][V]. Notation: "-" is a whole step, adjacent digits are a half step (Bornoff 1948
  lineage). Numbers follow the order of Dakon's general list. His prose examples
  (B♭–D and B–D♯ on A) number the two extended patterns the other way round, and numbering
  differs between authors ("It doesn't matter how these finger patterns are numbered",
  violinonline [VO][V]).

| Pattern | Shape | Steps 1→2, 2→3, 3→4 (st) | 1→4 span | D string, 1st position (0 = D4) | Typical keys |
|---|---|---|---|---|---|
| FP1 | 1-23-4 | 2,1,2 | 5 (P4) | E F♯ G A | D, A, G major on lower strings |
| FP2 | 12-3-4 | 1,2,2 | 5 (P4) | E F G A | C major, D minor |
| FP3 | 1-2-3-4 | 2,2,2 | 6 (A4) | E F♯ G♯ A♯ | A major (D, A strings) |
| FP4 | 1-2-34 | 2,2,1 | 5 (P4) | E♭ F G A♭ (low 1) | F, B♭ (flat keys) |

- Dakon sets the violin/viola hand frame in class teaching as fingers 1→3 (minor third for FP1
  and FP2), widened to a major third for FP3 and FP4. Violin and viola patterns reach an
  augmented fourth (1→4 = 6 st), cello patterns a major third, and the bass a major second
  [DAK][V].
- The violinist.com program used three standard postures: half-whole-whole, whole-half-whole and
  whole-whole-half. It did not model extensions (whole-whole-whole was judged uncomfortable in
  1st position for some hands) [VAF][V].
- **Ševčík's "Semitone System"** (*School of Violin Technics*, Op. 1, 1880; the 1901 elementary
  tutor) teaches one finger pattern on all four strings at a time, e.g. "semitone from 1st to 2nd
  finger" (_XX_X_X), instead of following diatonic scales [WSE][VFP][V].

Allowed finger offsets relative to finger 1, for a solver [derived from above; T]:
| Finger | Normal offset (st) | Contracted | Extended |
|---|---|---|---|
| 1 | 0 | — | −1 (backward extension, "1 back") |
| 2 | 1–2 | — | 3 |
| 3 | 2–4 (3 most common) | — | 5 |
| 4 | 4–6 (5 normal) | 4 | 7 (unison/octave-harmonic reach), 8–9 = tenth stretch |

Stretches between adjacent fingers should stay within 1–2 st. Strings Magazine (Flavin 2026):
"intervals larger than a whole step between adjacent fingers involve extensions. For non-adjacent
fingers, an extension occurs if the spacing between them is greater than two whole steps"
[EXT][V].

### 2.3 Extensions, contractions, creeping, thumb
- **Extensions.** A note "played outside of the normal compass of a position, without any
  shift". Example: 3rd position on A, with finger 1 stretched back to C♯ or finger 4 up to A.
  Extensions are "less intrusive than a shift or string crossing" for one or two outlying notes
  [WV][V]. Grove: notes beyond the compass "are frequently reached by extension of the fingers,
  without the hand leaving its position" [GRP][V]. Geminiani and Locatelli first used
  extensions and contractions systematically [MY11][V]. L. Mozart advocated 4th-finger
  extensions to keep a phrase on one string (his f2 example) [MY11][V].
- **Extensions vs shifting by hand size.** Flesch avoided forward 4th-finger stretches in 1st
  position and shifted for broken tenths. Galamian used the stretch [MY11][V]. Both use backward
  stretches to remove unwanted glissandi [MY11][V].
- **Creeping fingering** (Galamian, Flesch, Yampolsky): stretch to the note, then let the hand
  follow into the new position while that note sounds. It "eliminates many glissandi"
  [MY11][VSM][V].
- **Thumb.** In low positions the thumb moves with the hand and defines the position. In high
  positions it parks where the neck meets the body [WV][V]. Schroeder: in 3rd position the ball of
  the hand meets the ribs, and from 4th position up the thumb withdraws under the neck [SCH][V].
  Auer: in 5th–7th the thumb is held "toward the end of the neck near the ribs" [AUE][V]. For
  downward shifts the thumb leads (Flesch, Galamian, Yankelevich) [STS][V].
  **Model consequence:** above about 4th position the effective "position" no longer has a
  physical thumb anchor. Cost per semitone of hand travel can drop, while upper-register string
  choice gets costlier (see §4).
- **Upper positions on the G string.** These are used for the "heroic" or sonorous colour
  (Flesch [MY11][V]; Grove: a Spohr passage "if not played entirely on the sonorous 4th string,
  would absolutely lose its peculiar character" [GRP][V]). Szigeti: a sforzando f♯1 is stronger
  as 4th finger on G than in 1st position on D [MY11][V].

### 2.4 Higher-position rules from the Flesch/Galamian comparison [MY11][V]
- Use finger 3 instead of finger 4 high up, to avoid over-supinating the arm (both).
- Flesch: more string crossings, stay ("restez") in higher positions for intonation. Galamian:
  more shifting and fewer crossings, to use the E string's radiance.
- Enharmonic re-spelling for fingering: a diminished third is fingered as a major second with
  adjacent fingers, and a diminished seventh as a major sixth with adjacent fingers (both).
- Flesch: do not finger a minor third or augmented second with adjacent fingers. Galamian: do.

---

## 3. Shifting

### 3.1 Mechanics and classification
- **Guide finger.** "The last finger to play a note in the old position continuously lightly
  touches the string during the course of the shift to end up on its correct place in the new
  position." It should rarely be audible except as deliberate portamento [WV][V].
- **Schroeder's four cases:**
  1. Same finger before and after: it "must slide over the string firmly, and without leaving
     it".
  2. Ascending to a higher finger: the old finger slides to its place in the new position and
     lifts once the new finger is down.
  3. Descending: the old finger slides with the hand and is lifted.
  4. Not slurred: slide "so quickly that no notes are heard between". Slurred: the portamento
     will be audible and must not become "whining".

  [SCH][V].
- **Old-finger vs new-finger slide.** French vs Russian:
  - Kreisler preferred the "French slide, which began with old finger".
  - Heifetz is associated with the "Russian slide, an under-slide originating with the arrival
    finger" [KRU][V].
  - In Flesch's German terminology, as quoted in Japanese translation, these are the "A-" and
    "E-portamento" (Anfang/Ende = beginning/end finger) [FLN][V]. English editions call them
    **B-portamento** (beginning finger slides) and **L-portamento** (last finger slides) [T].
  - Flesch noted that the E/L type was once taboo and later became normal [FLN][V].
  - Strad/Klopčič: when shifting between strings, "the string on which one makes the actual
    shift is determined by the guide note" [STS][V].
- **Lecher's shift types** (from *Violin/Viola Technique: The Manual*): "end-over" or "old/new"
  (the most used), "connecting" or "same finger", "into", "from/into", "from beneath", and
  "walking" shifts [GPS][V].
- **Intermediate note.** The old finger slides to where it would be in the new position, then the
  new finger drops [DUM][V]. Yankelevich's oscillograms of Oistrakh and others show the sliding
  finger seldom reaches the intermediate note. In shifts of a seventh it fell short by a tone or
  more, and in tenths by up to 4½ tones [STI][V]. Do not model the intermediate note as a hard
  waypoint.
- **Dounis:** "The shifting finger exerts no pressure on the string (as lightly as for a
  harmonic)" [STS][V].
- **Galamian vs Flesch on scale shifts.** In the one comparable excerpt (Paganini Caprice 19,
  sul G), Galamian shifts on the strong beats and Flesch between them [MY11][V].
- **Yost.** A Yost shifting system (Gaylord Yost) exists in American pedagogy; it was not fetched
  this session [?].

### 3.2 Where to shift (hiding the shift)
| Shift on / at | Source |
|---|---|
| a semitone (inaudible "half-step shift"); best when also a finger change and a bow change | [PHI][KRU][MY11][V] |
| an open string (hand moves while the open string sounds) | L. Mozart, Yampolsky, Flesch, Galamian [MY11][KRU][V]; Grove: Locatelli [MY11][V] |
| a harmonic | Yampolsky, Flesch (Galamian: no) [MY11][V] |
| a repeated note | Yampolsky [MY11][V] |
| a bow change, the main beat | L. Mozart [KRU][V]; Yampolsky: "bowings and position change should often occur simultaneously" [MY11][V] |
| after a longer note, before a short one (dotted figures: after the dot) | L. Mozart [KRU][V]; Flesch and Galamian for double stops [MY11][V] |
| rhythmic group boundaries ("rhythmic fingering"; avoid "antirhythmic" fingerings) | Auer [AUE][V] |
| a rest / phrase boundary | Flesch shifts *before* the end of a phrase to prepare; Galamian ends the phrase, then shifts [MY11][V] |

Further rules:
- L. Mozart: when no longer constrained, "one must not instantly run headlong down but await a
  good and easy opportunity … that the listener does not perceive the change" [MY11][V].
- Three reasons to change position (L. Mozart): **necessity** (range), **convenience** (wide
  leaps) and **elegance** (cantabile notes kept on one string) [MY11][V].
- Grove gives the same three in other words: absolute necessity (double stops), convenience
  (wide-range passages) and tasteful rendering (string colour) [GRP][V].
- Grove: the "commonest and easiest method of shifting is to advance by intervals of a third",
  1st → 3rd → 5th, using fingers 1 and 2 alternately on one string [GRS][V].
- Grove: shifts should be "effected quietly and firmly … the thumb moving slightly in advance"
  [GRS][V].
- Kruse: "Many standard scale fingerings ascend in plus-two position shifts and descend in
  minus-three position shifts. A half-step is played with the 4th finger at the top of the
  scale" [KRU][V].
- Tertis: "descending slides should happen in the new bow with a new finger. Generally,
  ascending slides should be executed with the old finger when both notes are slurred, or with
  the new finger when notes are separate" [TER][V].

### 3.3 Half-step shifts (same finger, one semitone) — a real disagreement
- **Flesch:** avoid the half-step shift, especially in a slur, and use different fingers instead.
  Never use two half-step shifts in a row [MY11][V].
- **Galamian:** uses the half-step shift within slurs. Also never two consecutive [MY11][V].
- **Szigeti** used semitone shifts with the same finger frequently [MY11][V]. A violinist.com
  respondent: "I am also a big fan of the semitone slide within a diatonic phrase" [VC1][V].
- **Descending scales:** Flesch shifts the hand between notes a half step apart, Galamian between
  notes a whole step apart [MY11][V].
- **Same finger on consecutive scale notes:** Flesch, never. Galamian, not on a whole step
  [MY11][V]. Kruse: "Avoid using the same finger in a row more than two times … repeated use of
  sliding half-steps is not ideal" [KRU][V].
- **Arpeggios:** Flesch never uses the same finger for consecutive notes. Galamian shifts in
  arpeggios by taking two consecutive notes with the same finger [MY11][V].
- **Model:** a same-finger semitone shift should be cheap (style parameter). A same-finger shift
  of 2 or more st should be expensive, since it is an audible slide. Two in a row should be very
  expensive.

### 3.4 Leaps
- If the leap coincides with a bow change, it is easier (both) [MY11][V].
- Flesch prefers a shift connected to the previous note, or prepared, over a pure leap. Galamian:
  "Leaps should be used often" [MY11][V].
- Grove example: three low notes plus two high notes per group. "If started at once in the fifth
  position there is no difficulty", whereas jumping 1st → 5th every group is "quite impossible"
  at speed [GRP][V]. Lookahead matters: choose the position that contains the whole figure.

### 3.5 Portamento (expressive) vs glissando (technical)
- Yampolsky distinguishes glissando as a technical tool from portamento as an expressive one
  [MY11][V]. Flesch draws the same distinction: a glissando "carries no expressive effect" and
  must be inconspicuous, while a portamento is placed "only when the melody rises emotionally"
  [FLN][V].
- Flesch often used a portamento into the climactic note of a phrase. Galamian often did not, and
  used more audible shifts in Romantic than in Baroque repertoire [MY11][V].
- Paganini played fast scales and cantilena with one finger (glissando technique) [MY11][V].
  Ricci (*Ricci on Glissando*, 2007) trains one-finger scales over an open-string drone. Myers
  judges this incompatible with shift-based fingering systems [MY11][V].
- Automatic fingering default: no expressive slides. An optional "romantic" style lowers the
  same-finger shift cost on long slurred intervals of 3–5 st that rise into a long note.

### 3.6 Stay low vs go up
- Stay in 1st position when the passage fits, and teach 2nd/half position to avoid shifting on
  "every alternate note" [GRS][V].
- Go up for one-string colour (sul G, sul D), to avoid single-note crossings, and for passages
  that span more than one position's compass.
- Galamian: "shifting up the fingerboard only when necessary" in one excerpt type [MY11][V].
- Flesch moved into higher positions in Bach to stay on one string. Galamian stayed low and
  crossed strings [MY11][V].

---

## 4. String crossings and string choice
- **Timbre per string (Flesch):** G "heroic", D "intimately charming", E "radiant". The A string
  is "reserved for when the E string's radiance is inappropriate" [MY11][V].
- **Yampolsky:** E and G are "virtuosic and brilliant", while A and D are "rather dull" in upper
  registers and suited to gentle cantilena [MY11][V]. Kruse: "Avoid crossing over to lower
  strings in high positions, as the tone is less clear" [KRU][V].
- **Uniform timbre.** Keep melodic segments on one string; similar segments go on the same string
  again (both) [MY11][V].
- Grove: a Kreutzer Sonata phrase that lies in 1st position "must … be played entirely on the 2nd
  string, in the first and third or second position alternately". Otherwise the constant crossing
  sounds "jerky and uneven". Where contrast is wanted, different strings are used even when one
  string would do [GRP][V].
- **Crossing vs shifting.** "When shifting is impractical in fast passages, crossing strings is
  preferred. Avoid crossing strings for just one note" [KRU][V]. "Avoid changing strings to play
  only one note. Shift if necessary" (Flesch and Galamian) [MY11][V]. Second position avoids
  "crossing to a new string to play one note" [MY11][V].
- **Where to cross:**
  - Szigeti preferred to change string on a whole tone rather than a semitone [MY11][V].
  - Yampolsky: change strings on strong beats so the timbre change does not distract [MY11][V].
  - Galamian: "Do not cross strings in the opposite direction of the line" (e.g. back to an open
    string below while ascending). Flesch accepts this to gain an open-string shift [MY11][V].
- **Bow side (brief):**
  - Yampolsky's three bowing guidelines: avoid bow crossings over two strings, keep the melody on
    one string, coincide position change and bow change [MY11][V].
  - Skip crossings (e.g. G to E) need a bow change (both) [MY11][V].
  - Tertis: change string "smoothly, quietly and at the last moment" [TER][V].
- **Yampolsky's three "irrational" fingerings** [MY11][V]:
  1. the same finger in succession for more than one note;
  2. crossing a string to use the same finger again immediately (the oblique crossing);
  3. fingers moving simultaneously in opposite directions (in chords).
- **Oblique crossing rule** (Yampolsky, Flesch; Galamian when the notes are consecutive or
  simultaneous): avoid moving one finger to an adjacent string a semitone (or any non-fifth)
  away. Use extended or contracted fingerings or mixed positions instead [MY11][V].
- **Fifths with one finger.** A perfect fifth is played with finger 1 or 2 (Flesch: not 3;
  Galamian allows 3), also when broken [MY11][V]. On the cello "it is used flat" across two
  strings [WC][V]. Diminished fifths go on adjacent fingers (L'Abbé, 1761) [MY11][V].
  Implication: the "same finger, adjacent string, exactly 7 st apart" move is cheap, but
  intonation of a slightly impure fifth is the player's risk [T].

---

## 5. Open strings
- **Character.** Open strings sound different, since the string "vibrates more freely at the
  nut". "It is impossible to use vibrato fully on an open string" [WV][V].
- **Classical habit.** Classical violinists often use a crossing or a shift to avoid the open
  string's timbre "unless indicated by the composer", especially the open E, which is "often
  regarded as having a harsh sound" [WV][V].
- **When open strings are used** [WV][V]:
  - fast scales or arpeggios ("if the note does not have time to ring");
  - drones and bariolage (Bach E-major Partita);
  - folk and fiddle styles;
  - Baroque music "where shifting position was less common";
  - when the composer asks for one.
- **Flesch vs Galamian:**
  - Flesch replaced the open E with finger 4 even in détaché ("Not only in legato playing but also
    in the detache, the open E … should be replaced by the use of the fourth finger"), partly from
    dislike of the steel E. Galamian uses the open E often [MY11][V].
  - Flesch: "open strings should be used in cantilena as little as possible, since they lack
    expressive power" [MY11][V].
  - Flesch even rewrote a Bach bariolage to avoid the open E [MY11][V].
- **Scale default.** Schroeder: "As a rule in ascending passages the open string is used;
  downwards, the 4th finger is preferred in its stead" [SCH][V]. This is exactly the Galamian
  stand-alone-octave tables in §6 [DV][V]. Kruse: "Avoid open strings on strong beats and/or long
  notes in a melodic passage", and avoid open E in many orchestral passages (e.g. *Don Juan*)
  [KRU][V].
- **4th finger vs open string.** Flesch saved the climactic sustained note for finger 3 (better
  vibrato) rather than 4. Galamian trained the 4th finger to match [MY11][V]. Yampolsky limited
  the 4th finger in cantilena "because of the lack of expressive tone" [MY11][V]. Kruse
  substitutes a stronger finger for a weak little finger [KRU][V].
- **Shifting via open strings.** These shifts are inaudible [KRU][MY11][V]. Flesch and Galamian
  both use the open E to shift back down to 1st [MY11][V]. Earliest documented rule: Galliard
  tablature (early 17th c.) shows 4th finger descending and open string ascending (Yampolsky's
  history) [MY11][V].
- **Ringing tones.** There are nine stopped notes in 1st position that sound a unison or octave
  with another open string and make it resonate sympathetically. They are used to check
  intonation [WV][V]. A small preference for these notes in slow music is defensible [T].
- **Natural harmonics** [WV][KRU][V][calc]:
  - Touching at an integer division of the string gives that partial.
  - L/2 (12 st above the open string) sounds the octave.
  - L/3 (7 st, where finger 4 stops in 1st position) sounds octave + fifth (+19 st).
  - L/4 (5 st, where finger 3 stops in 1st position) sounds two octaves (+24 st).
  - The octave harmonic is commonly taken "by extending the 4th finger upward from third
    position" [KRU][V]. On the E string it sounds E6 (88).
  - Harmonics are written with a circle or diamond heads [WV][V].
  - Flesch uses harmonics to shift or for "glassy" or bell-like colour. Galamian seldom does
    [MY11][V]. Kruse avoids them in Baroque and Classical music [KRU][V].
- **Artificial harmonic.** Stop with finger 1 and lightly touch with finger 4 a fourth higher;
  this sounds two octaves above the stopped note. Touching a major third or a fifth up is also
  possible but rarer [WV][V]. At the octave, harmonics in low positions need "a wide stretch …
  impossible for small hands" [SCH][V].

---

## 6. Standard fingerings to use as test oracles

### 6.1 First-position map, violin (Tunable chart, citing Galamian) [TUN][V]
| String | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| G | G3 55 | A3 57 | B3 59 | C4 60 | D4 62 |
| D | D4 62 | E4 64 | F♯4 66 | G4 67 | A4 69 |
| A | A4 69 | B4 71 | C♯5 73 | D5 74 | E5 76 |
| E | E5 76 | F♯5 78 | G♯5 80 | A5 81 | B5 83 |

The highest note in 1st position is B5, played with 4 on E [WV][V]. Low and high variants:
finger 2 low = semitone above 1 (flat keys), high = whole tone (sharp keys). "The 3rd and 4th
fingers do not change between the two configurations" in that basic chart (folkstrings, search
snippet only [?]).

### 6.2 One-octave scale rules [SCH][V]
"To each note in the first position belongs its own finger, whether the note is raised or
lowered a semitone." Ascending uses the open string and descending uses finger 4. "If the notes
of the open strings are raised a semitone, usually the 4th finger plays it on the string below"
(e.g. D♯4 = G4, not D1-low).

### 6.3 Three-octave scales, violin — Galamian fingerings via DiscoverViolin [DV][V]
The source writes each octave as a stand-alone 8-note group, with the tonic repeated at the
start of the next group. The decoding below is checked note by note against the anchor table;
every cell is consistent. "–" marks a shift. The same fingerings serve melodic minor except G♯
and C♯ minor. G and B♭ major shift to 4th position; A, A♭ and A minor shift to 3rd; C and D major
"begin in 3rd position" [DV][V].

**G major (also G minor), ascending:**
| G3 55 | A3 | B3 | C4 | D4 | E4 | F♯4 | G4 67 |
|---|---|---|---|---|---|---|---|
| G0@1 | G1 | G2 | G3 | D0 | D1 | D2 | D3 |

| G4 | A4 | B4 | C5 | D5 74 | –E5 76 | F♯5 | G5 79 |
|---|---|---|---|---|---|---|---|
| D3@1 | A0 | A1 | A2 | A3@1 | **A1@4** | A2@4 | A3@4 |

| G5 | A5 81 | B5 83 | C6 84 | –D6 86 | E6 | F♯6 | G6 91 |
|---|---|---|---|---|---|---|---|
| A3@4 | A4@4 | E1@4 | E2@4 | **E1@6** | E2@6 | E3@6 | E4@6 |

Descending (string/finger): G6 E4, F♯6 E3, E6 E2, D6 E1@6 – C6 E2@4, B5 E1, A5 A4@4, G5 A3 |
G5 A3, F♯5 A2, E5 A1@4 – D5 A3@1, C5 A2, B4 A1, **A4 D4**, G4 D3 | G4 D3, F♯4 D2, E4 D1,
**D4 G4**, C4 G3, B3 G2, A3 G1, G3 G0. The descent replaces open A and open D with finger 4,
matching Schroeder's rule [SCH][V].

**A major (also A♭, A minor) — 3rd, 5th and 7th positions on E:**
- Ascending: A3 G1@1, B3 G2, C♯4 G3, D4 D0 (printed "(0)", optional), E4 D1, F♯4 D2, G♯4 D3,
  A4 D4 | A4 A0, B4 A1, C♯5 A2 – D5 A1@3, E5 A2, F♯5 A3, G♯5 **A4@3 (high 4, 1→4 = A4,
  6 st)**, A5 E1@3 | A5 E1@3, B5 E2 – C♯6 E1@5, D6 E2 – E6 E1@7, F♯6 E2, G♯6 E3, A6 93 E4@7.
- Descending: A6 E4, G♯6 E3, F♯6 E2, E6 E1@7 – D6 E4@3, C♯6 E3, B5 E2, A5 E1 | A5 E1, G♯5 A4,
  F♯5 A3, E5 A2, D5 A1@3 – C♯5 A2@1, B4 A1, A4 D4 | A4 D4, G♯4 D3, F♯4 D2, E4 D1, D4 G4, C♯4 G3,
  B3 G2, A3 G1.

**C major (C minor, C♯ minor) — starts in 3rd position:**
- Ascending: C4 G1@3, D4 G2, E4 G3, F4 G4, G4 D1@3, A4 D2, B4 D3, C5 D4 | C5 D4, D5 A1@3, E5 A2,
  F5 A3, G5 A4, A5 E1@3, B5 E2 – C6 E1 (a=8, "5th") | C6 E1, D6 E2 – E6 E1@7, F6 E2 – G6 E1
  (a=15, 9th), A6 E2, B6 E3, C7 96 E4.
- Descending: C7 E4, B6 E3, A6 E2, G6 E1 – F6 E3@6, E6 E2, D6 E1@6 – C6 E3@3 | C6 E3, B5 E2,
  A5 E1, G5 A4, F5 A3, E5 A2, D5 A1, C5 D4 | C5 D4, B4 D3, A4 D2, G4 D1, F4 G4, E4 G3, D4 G2,
  C4 G1.

**D major (D♭ major, D minor) — starts with 2 in 3rd position on G:**
- Ascending: D4 G2@3, E4 G3, F♯4 G4 (high 4), G4 D1@3, A4 D2, B4 D3, C♯5 D4 (high 4), D5 A1@3 |
  D5 A1, E5 A2, F♯5 A3, G5 A4, A5 E1@3, B5 E2 – C♯6 E1@5, D6 E2 | D6 E2 – E6 E1@7, F♯6 E2 –
  G6 E1@9, A6 E2, B6 E3, C♯7 E4 (high 4) – **D7 98 E4 (same-finger semitone shift at the top)**.
- Descending: D7 E4 – C♯7 E4, B6 E3, A6 E2, G6 E1 – F♯6 E3@6, E6 E2, D6 E1 | D6 E1@6 – C♯6 E3@3,
  B5 E2, A5 E1, G5 A4, F♯5 A3, E5 A2, D5 A1 | D5 A1@3, C♯5 D4, B4 D3, A4 D2, G4 D1, F♯4 G4, E4 G3,
  D4 G2.

The same page gives continuous "Galamian style" versions, written in 4-note groups (e.g. G major
"0210 1230 1230 123–1 2341 2–123"). Their grouping was not decoded unambiguously, so they are
not used as oracles [DV][?].

### 6.4 Three-octave scales — Cora Cooper (Kansas State), violin and viola [KSU][V]
"All scales have a 'turn' at the beginning and the end … Keys in parentheses are for viola. Each
block of numbers indicates one string; hyphens indicate a shift or extension." This is direct
evidence that **viola uses the identical fingering a fifth lower** (violin G major = viola C major).

| Key (viola) | Ascending, one block per string (G, D, A, E) |
|---|---|
| G major (C) | `0210 1234` · `12-1234` · `1234` · `12-1234-4` (descend the same way) |
| G-string majors A♭–C♯ (viola D♭–F♯) | `1321234` · `1234` · `12-1234` · `123-1234-4` |
| D major (G) | blocks on D, A, E: `0210 1234` · `12-1234` · `123-123-1234-4` |
| D-string majors E♭–F♯ (viola A♭–B) | blocks on D, A, E: `1321234` · `123-1234` · `123-123-1234-4` |
| G minor (C) | up `02101234 12-1234 1234 123-1234`; down `(4)32-321 4321-321 4321 43210210` |

Decoding: the opening turn is tonic, 3rd, 2nd, tonic (G major: G B A G = 0 2 1 0), then the
scale runs up from the 2nd degree. **G major, Cooper version:**
- From A3: A3 G1@1, B3 G2, C4 G3, D4 **G4** | E4 D1, F♯4 D2 – G4 D1@3, A4 D2, B4 D3, C5 D4 |
  D5 A1@3, E5 A2, F♯5 A3, G5 A4 | A5 E1@3, B5 E2 – C6 E1 (a=8), D6 E2, E6 E3, F♯6 E4 (high 4) –
  G6 E4.
- This gives 21 notes A3–G6 [calc check].
- It differs from §6.3 (no open D or A; first shift on the D string rather than the A string;
  the top semitone is taken by finger 4). **Both are authoritative.** Test against a set of
  acceptable fingerings, not a single one.

**A major, Cooper version (G-string pattern):** A3 G1, (turn C♯ B A), B3 G2, C♯4 G3, D4 G4 |
E4 D1, F♯4 D2, G♯4 D3, A4 D4 | B4 A1, C♯5 A2 – D5 A1@3, E5 A2, F♯5 A3, G♯5 A4 | A5 E1@3, B5 E2,
C♯6 E3 – D6 E1@6, E6 E2, F♯6 E3, G♯6 E4 – A6 E4.

Kruse's generalisation, "ascend in plus-two position shifts … descend in minus-three" [KRU][V],
fits C and D major in §6.3 exactly: up 3→5→7→9 on E, down 9→6→3 [calc]. G and A major deviate:
A major descends 7→3 in one shift.

### 6.5 Two-octave viola patterns (tonebase, C. Kim) [TBV][V]
"Every scale starts on 1st finger (except for C and G Major)". Starting on the C string:
`1234 1234 1234 12…`. Starting on the G string: `1234 1234 123 - 123 4`. For example, A major on
G from A3: A3 G1, B3 G2, C♯4 G3, D4 G4 | E4 D1 … A4 D4 | B4 A1, C♯5 A2, D5 A3 – E5 A1@4, F♯5 A2,
G♯5 A3, A5 A4 [calc]. The C-string line as printed has 14 digits for 15 notes; the last block is
probably `123` [?]. For three octaves "the pattern starting on the 2nd finger [is] probably …
the most versatile and most common" [TBV][V].

### 6.6 Chromatic scales
**Newer fingering** (no same-finger semitones; both Flesch and Galamian prefer it in their
treatises [MY11][V]), as taught by Kennedy Violins [KEN][V], 3 octaves from G3:
- G string: G3 0, G♯3 1 (½ pos), A3 2 | A♯3 1, B3 2, C4 3, C♯4 4.
- The same 0 1 2 | 1 2 3 4 repeats on D (D4 … G♯4) and on A (A4 … D♯5).
- E string: E5 0, F5 1, F♯5 2 | G5 1, G♯5 2, A5 3, A♯5 4 | B5 1, C6 2, C♯6 3, D6 4 | D♯6 1, E6 2,
  F6 3, F♯6 4 – G6 4.
- Descending on E: `4-4321 4321 4321 (½) 210`. On the lower strings `4321-(½)21`; the open
  string is implied before crossing down [KEN][V].
- Variants on violinist.com: 0-1-2-1-2-3-4, "which they used to call 'Carl Flesch fingering'";
  0-1-2-3-2-3-4; 1-2-3-1-2-3 high up [VC1][VC2][V].
- Bériot is credited with the "different finger on each half step" fingering [KRU][V]. Yampolsky
  traces consecutive chromatic fingering to Geminiani [MY11][V]. These are two different
  historical claims; neither was checked against the treatises.

**Older (sliding) fingering** (Schroeder): "the 1st, 2nd and 3rd fingers will each be used twice
in succession … The 4th has one note only on each string". Per string: 0 1 1 2 2 3 3, e.g.
G3 0, G♯3 1, A3 1, A♯3 2, B3 2, C4 3, C♯4 3, D4 0 [SCH][V]. A common variant is
"0 1-1 2-2 3 4 0" [VC2][V]. It is defended as "very expressive at slow tempos" [VC2][V].
- Auer: on descending string changes "all four fingers drop into place at one and the same
  time", so sliding over more than a semitone is impossible [AUE][V].

Flesch and Galamian edition examples, finger strings only (pitches not reproduced in [MY11]):
- Paganini Caprice 5 (Flesch): `1123401212340121234012123212104321210432121043211` (Galamian
  used the older style ascending here);
- Caprice 17 (Flesch): `4321213143212142`;
- Caprice 24 (Flesch): `143213213` [MY11][V].

These are useful only for checking digit statistics: repeated consecutive fingers are rare
(only the `11` at the start and end of the Caprice 5 string).

### 6.7 Arpeggios and broken chords
- Broken minor triad in one position: fingers **1-2-4** (Flesch and Galamian) [MY11][V].
- First-inversion triad: Flesch 1-2-4, Galamian 1-3-4 [MY11][V].
- Ascending triads by extension: 1-3-4 or 1-2-4 "depending on your hand frame" [KRU][V].
- Fully diminished seventh ascending: **4-2-1-3**, which avoids oblique crossings; descending
  is the reverse. Diminished seventh with M6 below a tritone: 1-3-2; with a tritone below an M6:
  2-1-3. Top three notes of a half-diminished seventh: 1-2-4 [MY11][V].
- Two-octave G-major arpeggio in 1st position: G3 G0, B3 G2, D4 D0, G4 D3, B4 A1, D5 A3, G5 E2
  (low 2) [T].

### 6.8 Suzuki Book 1 / Twinkle (A major, 1st position) [MF][WSU][V]
Suzuki's ten violin volumes begin with his *Variations on "Twinkle Twinkle Little Star"* [WSU][V].
In the Suzuki book the theme is in A major, starting on open A [MF][V].

| A4 | A4 | E5 | E5 | F♯5 | F♯5 | E5 | D5 | D5 | C♯5 | C♯5 | B4 | B4 | A4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A0 | A0 | E0 | E0 | E1 | E1 | E0 | A3 | A3 | A2 | A2 | A1 | A1 | A0 |

The middle section "E E D D C♯ C♯ B" (twice) is E0 E0 A3 A3 A2 A2 A1 [MF][V]. This is beginner
practice: open strings everywhere, including the open E in a "melody". An "expressive"
cost profile would replace E0 with A4 in this tune. The algorithm needs a level or style switch:
beginner / baroque / romantic.

---

## 7. Double stops and chords
Notes must be on **adjacent** strings, in one position or a mixed position [GRP][V]. A double stop
whose notes lie on the same string, or on non-adjacent strings, in the current position must be
played elsewhere. E.g. E4+G4 (both on the D string in 1st position) "must be played in the second position (2nd and 4th finger) or in
the third position (1st and 3rd finger)" [GRP][V]. The widest interval in one position "naturally"
is the octave (1 on the lower string, 4 on the upper); tenths and more need extension [WV][V].

| Interval | Standard fingers (lower note, upper note) | Notes / source |
|---|---|---|
| Unison | 4 (extended, +7 st) on the lower string + 1 on the upper, or stopped lower + open upper | Flesch, Galamian [MY11][V]; unison with open string, positions 1–4 [SCH][V] |
| Second | 4 + 1 | [MY11][SCH][V] |
| Third | 3 + 1 or 4 + 2; also 3-4 in series | [MY11][SCH][V]; Flesch allows an open lower note, Galamian keeps the upper note on the upper string [MY11][V] |
| Fourth | P4: change position to avoid oblique crossings; A4: 1-2 or 2-3 | [MY11][V] |
| Fifth | one finger flat across both strings (1 or 2; Galamian also 3) | [MY11][WC][V] |
| Sixth | adjacent fingers (1+2, 2+3, 3+4) | [MY11][V]. Consecutive minor sixths a whole step apart: 1-2 then 3-4. Major sixths a half step apart: 1-3 then 2-4 [MY11][V] |
| Seventh | 1 + 3 or 2 + 4 | [MY11][V] |
| Octave | 1 + 4 normally; 1 + 3 high up or after a 4; fingered octaves 1-3/2-4 in fast scalar runs | [MY11][WV][V]; Yampolsky: fingered octaves fast, standard octaves in cantilena [MY11][V] |
| Tenth | 1 + 4 with extension (+8–9 st); prepare an extended hand | [MY11][WV][V] |

Notes:
- "Standard fingers" lists the finger on the lower string first. The interval is
  `7 + off(upper finger) − off(lower finger)` st in the same frame [calc]. Examples: third
  3+1 = 7 + 0 − 3 = 4 (M3); sixth 1+2 = 7 + 2 = 9 (M6); octave 1+4 = 7 + 5 = 12; unison 4+1 needs
  off(4) = 7.
- Thirds in scales: position the hand "slightly more in favour of the upper finger … reach back
  with the lower finger" [SDS][V]. In G major thirds, "the spacing between fingers 1 and 3 should
  remain precisely constant" during shifts [SDS][V].
- **Chords.** Triple and quadruple stops are normally broken: one or two lower notes first, then
  the upper pair. A true triple stop is possible with a heavy stroke near the frog [WV][WDS][V].
  - Galamian always uses all four strings for four-note chords. Flesch sometimes does not, to keep
    the melody on one string [MY11][V].
  - Prepare the hand early for chords (both) [MY11][V].
  - Minor triad (ascending notes) **4-2-1**; major triad **4-3-1** (both) [MY11][V].
  - Slowly rolled chords may reuse a finger; quickly rolled ones may not [MY11][V].
- **Fingers moving in opposite directions** between chords is irrational (Yampolsky) [MY11][V].
- **Cost model.** A chord is a joint assignment. Strings must be distinct and adjacent. Fingers
  must be distinct unless the interval is a fifth taken with one finger. Every finger must lie in
  one frame, with the span limit from §2.2.

---

## 8. Trills, vibrato, fast passages, repeated notes, ornaments, glissando
- **Vibrato.** Impossible on open strings except as a sympathetic trick: vibrate the octave on
  the adjacent string [WV][V]. Most players oscillate below the note [WV][V]. Flesch keeps finger
  3 for climactic notes because of its richer vibrato [MY11][V]. Long notes in a lyrical style
  should therefore cost more when open, and somewhat more on finger 4.
- **Trills.** Flesch: use "whatever fingers will execute the trill most clearly". Rare exception:
  open string + finger 1 in Bach. Both editors use fingers 3-4 for a very high trill (Paganini
  Caprice 9) [MY11][V]. Dounis wrote *Fundamental Trill Studies*, Op. 18 [WDO][V]. Practical [T]:
  trill on two adjacent fingers on one string; avoid 3-4 trills at length because finger 4 is the
  weakest and least independent; open-string trills only for speed.
- **Repeated notes.**
  - L. Mozart's rule: change finger on a repeated note [MY11][V].
  - Yampolsky lists "the necessity of a change of fingering on repeated notes" among cantilena
    rules [MY11][V].
  - Galamian's treatise says a repeated note needs a finger substitution [MY11][V].
  - Szigeti's Wieniawski example uses a different finger each time [MY11][V].
  - A change of position on a repeated note is also a way to hide a shift [MY11][V].
  - In fast détaché repetitions, the same finger is normal [T].
- **Fast passages.**
  - Fewer shifts and more crossings. Open strings are acceptable [KRU][WV][V].
  - Auer: the half-tone movement in chromatics must be physically quick whatever the tempo
    [AUE][V].
  - Paganini's fast one-finger scales are a special technique [MY11][V].
- **Grace notes.** Flesch fingers a grace note and its main note as a chord, with all fingers
  placed at once. Galamian puts them on one string [MY11][V].
- **Glissando.** A notated glissando is a deliberate same-finger slide on one string, and the cost
  model should flip to allow it. Ricci's one-finger scales [MY11][V].

---

## 9. Hand size and physiology
- **Fingering is individual.** Auer: "the conformation of the hand, the structure and the
  strength of the fingers determine whether one or another fingering is easier". Editors should
  finger for "the normally shaped hand" [AUE][V]. Yampolsky: anatomy matters, e.g. small hands and
  fingered octaves [MY11][V].
- **Flesch vs Galamian as a hand-size axis.** Myers infers Flesch's hand was smaller than
  Galamian's.
  - Flesch shifted where Galamian stretched: forward 4th-finger stretches, broken tenths, and
    mixed positions for broken minor thirds.
  - "The violinist with a larger hand may have the tendency to use fingerings similar to those of
    Galamian, while the violinist with smaller hands may feel more comfortable using those of
    Flesch" [MY11][V].
  - **Implementation:** one `handSpan` parameter that moves the extension-vs-shift trade-off
    gives both editors' fingerings.
- **Fourth finger.**
  - Yampolsky limits it in cantilena [MY11][V].
  - Kruse: "Do you have a short, weak pinky? I often replace my 4th finger with a stronger finger"
    [KRU][V].
  - Galamian wanted all four fingers equal [MY11][V].
  - Finger independence is lowest for the ring and little fingers: the hand-physiology data in the
    piano brief, [HRS] there, applies [T].
- **Children's sizes.** Fractional violins exist because young players' "fingers are not long
  enough to reach the correct positions" [WV][V]. Scale lengths are in §1.2 [WSL][V]. Model a 1/2
  size by L = 287 mm. Frames are then 12 % narrower in mm, but the child's hand is smaller too,
  so semitone limits stay about the same [calc/T].
- **Viola reach.**
  - Spacing is wider for the same fingering. "The notes are spread out further along the
    fingerboard, although they do not usually require different fingerings" (Wikipedia) [WVA][V].
  - The violist "must bring the left elbow further forward or around" for the C string. Short-armed
    violists use smaller instruments [WVA][V].
  - Practitioners' rule (violinist.com thread on viola and small hands): "Violists should avoid
    stretches and extensions, shift positions more often, use the in-between, half-positions more
    often, and use enharmonic fingering more often" [VSM][V].
  - One small-handed violist counts half positions in a system "1/2, 1, 2, 2 1/2, 3, 3 1/2" and
    uses the "crawl"/"glide" shift: extend by a half step, then let the hand follow [VSM][V].
  - The fingering programmer found half position output "often" and remarked "violists got this
    right" [VAF][V].
  - Geometry agrees: viola 1st-position perfect fourth ≈ violin extended tritone (§1.3) [calc].
- **Thumb.** It follows finger 1 lightly. Auer: "Altogether too much is made of the thumb's
  importance" [AUE][V]. Moving it slightly before the fingers is recommended for downward shifts
  [STS][GRS][V].
- **Geminiani "chord" hand-setting exercise.** One finger per string spanning all four strings
  (from G: 1 on A♭, 2 on F, 3 on D, 4 on B, "open" setting), plus a reversed "closed" setting. It
  calibrates the frame across strings [BURI][V].
- **Dounis** (1921–42) built a "scientific" left-hand system: *Artist's Technique* Op. 12,
  *Absolute Independence of the Fingers* Op. 15, and *Specific Technical Exercises for Viola*
  Op. 25 [WDO][V].

---

## 10. Violin vs viola vs cello
| Aspect | Violin | Viola | Cello |
|---|---|---|---|
| Strings | G D A E | C G D A (a fifth lower) | C G D A (an octave below the viola) |
| Frame 1→4 | P4 (5 st); A4 (6 st) normal max | same patterns [DAK][KSU][V], wider in mm (+14 % at L=375) | minor third, 3 st; whole steps between 1-2 via extension ("1x2") [DAK][V] |
| Fingering of scales | — | same digits a fifth lower (Cooper) [KSU][V]; Flesch *Scale System* adapted for viola by C. Karman (C. Fischer, 1942) [KAR][V] | different system (1-2-3-4 = chromatic) |
| Half position | used, often replaced by a backward extension | used more (pragmatic) [VSM][VAF][V] | backward extension standard |
| Clef | treble | alto, treble for high passages [WVA][V] | bass/tenor/treble |
| Typical upper range | E7 orchestral | ≈ a fifth lower [?] | thumb position above the neck [WC][V] |
| Bow/response | — | thicker strings, slower response, more weight [WVA][V] | — |
| Fifths | one finger | one finger | one finger "used flat" [WC][V] |

Viola literature for scale and fingering practice:
- Primrose, *Art and Practice of Scale Playing* (1954), *Technique is Memory* (1960), *Violin
  and Viola* (with Menuhin, 1976), and *Playing the Viola* (1988, conversations with David
  Dalton, OUP) [WPR][V].
- Tertis, *Beauty of Tone in String Playing* (1938). His lesson rules are in §3.2 [TER][T for the
  book].
- Flesch–Karman *Scale System* for viola [KAR][V].
- Dounis Op. 25 [WDO][V].
- "Barnes" viola scales: not identified this session [?].
- The fingerings in Primrose's and Tertis's books were not available to fetch. Their specific
  rules, e.g. Primrose's scale-shift system, remain [?].

---

## 11. Distilled cost model and test cases

### 11.1 State and moves (suggested)
State per note: `(string s, anchor a, finger f)`; open string is `f=0` and leaves `a` unchanged.
Pitch check: `p = open[s] + a + off(f)`, where off(1)=0, off(2)∈{1,2,3}, off(3)∈{2,3,4,5}
and off(4)∈{4,5,6,7,8,9}. Non-default offsets carry a cost. Displayed position = `name(a)` from
§2.1. Run a beam or Viterbi search over the note sequence, with chords solved as joint
assignments. The structure mirrors the piano engine (`fingering/fingering.js`).

### 11.2 Rules with suggested relative weights
Weights are starting points for tuning (1 = minor nuisance, 10 = strongly avoided, ∞ =
impossible). "Style" marks rules that should change with a profile (beginner / baroque /
classical / romantic, or a Flesch- vs Galamian-like hand).

| # | Rule | Cost | Source |
|---|---|---|---|
| R1 | Pitch below open string, chord on non-adjacent strings, two notes on one string at once, finger outside reach | ∞ | §1, §7 [GRP][WV] |
| R2 | Each shift: base cost + k·distance in **mm** (from §1.3), measured from the old anchor to the new | 3 + 0.15/mm | §3 [GRS][WV] |
| R3 | Shift timing discount: on a semitone ×0.5, onto a new finger ×0.8, at a bow/slur boundary or after a rest ×0.6, after an open string or harmonic ×0.3, on a beat or group start ×0.8; shift *inside* a slur ×1.5 | multipliers | §3.2 [PHI][KRU][AUE][MY11] |
| R4 | Same finger on consecutive different pitches (audible slide): semitone 1 (Galamian) / 4 (Flesch); ≥2 st 8; two in a row +6 | style | §3.3 [MY11][KRU] |
| R5 | Extension beyond the frame: per st beyond span(handSize, L, a), quadratic; backward 1-extension cheaper than forward 4 | 2·x² | §2.3 [WV][MY11][EXT] |
| R6 | Augmented-4th frame (1-2-3-4 whole steps) | 1 | §2.2 [DAK][DV] |
| R7 | String crossing: adjacent 1, skip 3 (requires a bow change); crossing "for one note" and back +4 | 1/3/+4 | §4 [KRU][MY11] |
| R8 | Oblique crossing: same finger to an adjacent string at an interval ≠ P5, consecutive or simultaneous | 7 | §4 [MY11] |
| R9 | Perfect fifth on the same finger across strings | 0.5 (finger 3: +1) | §4 [MY11] |
| R10 | Timbre: leaving the current string mid-segment in a slurred/legato phrase | 2 per change | §4 [MY11][GRP] |
| R11 | Open string on a long note (≥ ~½ s), on a strong beat, or on the phrase climax | 4 (open E: 5) | §5 [WV][MY11][KRU]; style (beginner/baroque 0.5) |
| R12 | Open string in fast notes; open string as shift point | −0.5 (bonus) | §5 [WV][KRU] |
| R13 | Descending scale: open string where 4 on the lower string is available | 1 | §5 [SCH][DV] |
| R14 | Finger 4 on a long expressive note or climax (prefer 3) | 1.5 | §5 [MY11] |
| R15 | Position height: per position above 3rd on A/D/G strings in non-cantabile context | 0.3 | §1.4, §4 [KRU] |
| R16 | Prefer the sul-G/sul-D colour when the score says *sul G* / IV etc. | ∞ for other strings | §2.3 [WV] |
| R17 | Repeated note: same finger in slow legato | 1 (fast détaché: 0) | §8 [MY11] |
| R18 | Consistency: same fingering for the same transposed figure | −1 per matched note | §4 [MY11] |
| R19 | Lookahead: choose the position that contains the next figure; penalise shift–shift-back within ≤2 notes | 4 | §3.4 [GRP][GRS] |
| R20 | Same finger on two consecutive notes of an arpeggio (shifting) | 2 (Galamian 1) | §3.3 [MY11] |
| R21 | Chord finger patterns: minor triad 4-2-1, major 4-3-1, dim7 4-2-1-3 asc; deviation | 1 | §6.7, §7 [MY11] |
| R22 | Minor third / augmented second with adjacent fingers | Flesch 2 / Galamian 0 | §2.4 [MY11] |
| R23 | Natural harmonic substitution for the octave node note (style) | 0 to 3 | §5 [WV][KRU] |
| R24 | Viola multiplier: R5 ×1.5, half/intermediate positions −0.5 | style | §9 [VSM][VAF] |
| R25 | Half position (a=1) occupancy | 0.5 violin / 0 viola | §2.1 [MY11][VAF] |

### 11.3 Test cases (input → expected; ✓ = exact oracle, ≈ = acceptable-set member)
| ID | Input (MIDI) | Expected | Source |
|---|---|---|---|
| T1 ✓ | G major 1 oct ascending 55 57 59 60 62 64 66 67 | G0 G1 G2 G3 D0 D1 D2 D3, all 1st position | [TUN][DV][SCH] |
| T2 ✓ | same, descending 67 66 64 62 60 59 57 55 | D3 D2 D1 **G4** G3 G2 G1 G0 (finger 4 instead of open D) | [DV][SCH] |
| T3 ≈ | G major 3 oct ascending 55…91 | §6.3 G-major table (shift A3→A1@4, E2→E1@6) **or** §6.4 Cooper (shift on D string to 3rd) | [DV][KSU] |
| T4 ✓ | A major 3 oct, Galamian | §6.3 A-major line (A string 3rd position with high 4 on G♯5; E string 3rd→5th→7th) | [DV] |
| T5 ✓ | C major 3 oct from C4 (60) | starts G1@3; top: G6 E1@9 … C7 E4 | [DV] |
| T6 ✓ | D major 3 oct from D4 | starts G2@3; top D7 by same-finger semitone shift on 4 | [DV] |
| T7 ✓ | Twinkle, A major (§6.8) | A0 A0 E0 E0 E1 E1 E0 A3 A3 A2 A2 A1 A1 A0 (beginner profile) | [MF][WSU] |
| T8 ≈ | Twinkle, expressive profile | E5 notes as A4 (stay on A string); rest identical | R11/R10 [WV][KRU] |
| T9 ✓ | chromatic G3→G6 (55…91), "newer" | §6.6 Kennedy sequence; no same-finger consecutive pair except the final 4-4 | [KEN][MY11] |
| T10 ✓ | chromatic G3→D4, "older" style | 0 1 1 2 2 3 3 | [SCH] |
| T11 ✓ | one octave on each string from open, 1st position, 4 notes: D4 E4 F♯4 G4 / D4 E4 F4 G4 / D4 E4 F♯4 G♯4 | D0 1 2 3 with offsets FP1 / FP2 / FP3 | [DAK] |
| T12 ✓ | E♭ on open-string pitch: D♯4 (63) in a 1st-position G-string passage, e.g. 59 60 63 | G2 G3 **G4** (4 on lower string rather than low-1 on D) | [SCH] |
| T13 ✓ | double stop {64, 76} (E4+E5) in 1st position | D1 + A4 (octave = 1-4) | [WV][MY11] |
| T14 ✓ | double stop {64, 71} (E4+B4) | D1 + A1 (fifth, one finger flat) | [MY11][WC] |
| T15 ✓ | double stop {64, 67} (E4+G4) | both on the D string in 1st position (D1, D3) → **2nd position G4+D2** or **3rd position G3+D1** | [GRP]: "must be played in the second position (2nd and 4th finger) or in the third position (1st and 3rd finger)" |
| T16 ✓ | thirds {60,64} then {62,66} (C4/E4 → D4/F♯4), 1st position | G3+D1 then G4+D2 (3-1 then 4-2) | [MY11][SCH] |
| T17 ✓ | sixth {57,66} (A3/F♯4) | G1+D2 (adjacent fingers) | [MY11] |
| T18 ≈ | A-string run 72 74 76 74 72 (C5 D5 E5 D5 C5), legato | A2 A3 A4 A3 A2 (finger 4, not open E: no single-note crossing) | [MY11][KRU][GRP] |
| T19 ≈ | oscillation 72 74 76 77 76 74 72 (C5…F5) on A, legato | A1 A2 A3 A4 A3 A2 A1 in 2nd position (avoids 1st↔3rd shifting and an E-string F5) | [GRS][MY11] |
| T20 ✓ | repeated slow note 74 74 74 (D5, half notes, legato) | finger changes (e.g. A3, then 4 in 2nd/half or 1@3); never three identical | [MY11] |
| T21 ✓ | ascending fully-diminished 7th arpeggio in one position, 4 notes | fingers 4-2-1-3 | [MY11] |
| T22 ✓ | broken minor triad in one position | fingers 1-2-4 | [MY11] |
| T23 ✓ | natural harmonic request (o) at E6 on the E string | E4 extended from 3rd position (touch, octave node) | [KRU][WV] |
| T24 ✓ | viola C major 3 oct (48→84) | violin G-major Cooper digits on C G D A | [KSU] |
| T25 ✓ | viola A major 2 oct from A3 on G string | G1 G2 G3 G4 \| D1 D2 D3 D4 \| A1 A2 A3 – A1@4 A2 A3 A4 | [TBV] |
| T26 ≈ | sul G marking on a phrase spanning G3–G5 | all on G; positions up to ≈ 8th | [WV][GRP] |
| T27 ✓ | fast 16ths A4 B4 C♯5 D5 E5 F♯5 (69…78) staccato | A0 A1 A2 A3 E0 E1 (open E allowed in fast notes) | [WV] |
| T28 ✓ | same, slow cantabile with E5 a long climax | E5 = A4 (no open string on climax) | [WV][MY11] |
| T29 ≈ | descending chromatic E string top G6→E5 | 4-4 3 2 1 \| 4 3 2 1 \| 4 3 2 1 \| (½) 2 1 0 | [KEN] |
| T30 ✓ | consecutive major sixths a semitone apart | 1-3 then 2-4 | [MY11] |
| T31 ✓ | two consecutive minor sixths a whole step apart | 1-2 then 3-4 | [MY11] |
| T32 ≈ | small-hand profile, broken tenth in 1st position | shift instead of 1-4 stretch (Flesch); large-hand profile: stretch (Galamian) | [MY11] |

Note on T15: Grove's example is written `<g' e'>` (E4 and G4). In 1st position both notes lie on the D string (E4 = D1, G4 = D3), so the solver must move the lower note to the G string. Decoded against §2.1 [calc]: in 2nd position (a = 3–4) E4 = G4 and G4 = D2; in 3rd position (a = 5) E4 = G3 and G4 = D1.

---

## 12. Historical treatises — what each contributed (compact)
| Author, work | Contribution relevant to fingering | Tag |
|---|---|---|
| Galliard tablature (early 17th c.) | 4th finger descending, open string ascending | [MY11][V] |
| Merula (before 1639) | 1st–3rd (and 4th) positions already used | [GRS][V] |
| Corrette, *L'école d'Orphée* (1738) | seven positions | [MY11][V] |
| Geminiani, *The Art of Playing on the Violin* Op. 9 (London 1751) | 24 exercises; shifting, extensions and contractions; consecutive chromatic fingering; "keep fingers as firm as possible, and not to raise them until there is a necessity"; the "Geminiani chord"; opposed to L. Mozart on many points | [WGE][MY11][BURI][V]; Geminiani's numbered "orders" of positions [?] |
| L. Mozart, *Versuch einer gründlichen Violinschule* (Augsburg 1756) | necessity / convenience / elegance; whole vs half positions; shift on an open string, on the beat and bow change, after a long note; change finger on a repeated note; 4th-finger extension to stay on one string | [MY11][KRU][VAF][V] |
| L'Abbé le fils, *Principes du violon* (1761) | first known discussion of half position; diminished fifths with adjacent fingers | [MY11][V] |
| Khandoshkin | whole passages on one string | [MY11][V] |
| Baillot, *L'Art du violon* (1834) | best-known position studies (all in C major, per Grove) | [WBA][GRP][V] |
| Spohr, *Violinschule* (Vienna 1832) | codified current technique; Spohr invented the chinrest c. 1820, which freed the left hand for shifting (Ricci's thesis) | [WSP][MY11][V]; Spohr's own fingering rules [?] |
| Paganini | one-finger glissando scales; position-less virtuosity | [MY11][V] |
| Bériot (c. 1870) | separates expressive from technical fingering; credited with one-finger-per-semitone chromatics | [MY11][KRU][V] |
| Schroeder, *Handbook of Violin Playing* (Eng. tr.) | open-up/4-down rule; older chromatic fingering; shift mechanics; double-stop catalogue; viola chapter | [SCH][V] |
| Ševčík, Op. 1 (1880), Op. 8 *Changes of Position* (1895, 59 exercises), Op. 9 | Semitone System; exhaustive shift combinations ("Op. 8 contains virtually all combinations of shifts") | [WSE][IMS8][SP2][V] |
| Flesch, *Art of Violin Playing* (1923); *Scale System* (1926); *Violin Fingering: Its Theory and Practice* (Eng. 1966) | fingering definition; >1,700 examples; anti half-step shift; anti open string in cantilena; string characters; B/L portamento | [WFL][MY11][KRU][FLN][V]; *Scale System* date [T] |
| Auer, *Violin Playing as I Teach It* (1921) | inaudible shifts; rhythmic fingering; normal-hand editing | [AUE][V] |
| Dounis (Op. 12 1921 … Op. 29 1942) | finger independence, light shifting finger | [WDO][STS][V] |
| Yampolsky, *Principles of Violin Fingering* (Eng. OUP 1967) | rational vs irrational fingering; oblique crossings; inaudible shift tools; string characters | [MY11][V] |
| Galamian, *Principles of Violin Playing and Teaching* and *Contemporary Violin Technique* (both 1962) | frame shrinks; creeping fingering; half-step shift in slurs; open strings OK; varied scale fingerings | [WGA][STS][MY11][V] |
| Yankelevich | intermediary-note study (oscillograms) | [STI][V] |
| Szigeti, *Szigeti on the Violin* (1969) | P4 natural frame; whole-tone crossings; semitone shifts; finger change on repeated notes | [MY11][V] |
| Suzuki | 10 volumes from Twinkle; 1st position, open strings | [WSU][MF][V] |
| Simon Fischer, *Basics* (1997), *Scales* (Peters 2012) | modern exercise compendia (finger patterns, shifting, 3- and 4-octave scales) | [T] (contents not fetched) |

---

## References
- [MY11] P. T. Myers, *Guidelines for Violin Fingerings Based on Editions of Ivan Galamian and
  Carl Flesch*, DMA document, Univ. of Oklahoma, 2011. It surveys Yampolsky (incl. his history of
  Geminiani, L. Mozart, L'Abbé, Corrette, Paganini, Bériot), Ricci, Szigeti, and gives an
  appendix of Flesch vs Galamian guidelines.
  http://www.deviolines.com/wp-content/uploads/2013/septiembre/FinalDocElectronic050211.pdf
- [DV] DiscoverViolin, "3-Octave Scales with stand-alone octaves / Galamian style" (Galamian
  fingerings). https://discoverviolin.org/wp-content/uploads/2020/07/Galamian-scales-stand-alone-and-through-played.pdf
- [KSU] C. Cooper (Kansas State Univ.), "Three-Octave Scale Fingerings for Violin and Viola".
  https://www.k-state.edu/mtd/academics/music/orchestra/audition-excerpts/Violin%20Viola%20Scale%20Fingerings.pdf
- [TBV] C. Kim, *The Violist's Guide to Scales & Arpeggios* (tonebase).
  https://viola-community.tonebase.co/media/download/q5dm8s/viola-scales-arpeggios-guide-v1.pdf
- [SCH] C. Schroeder, *Handbook of Violin Playing*, tr. J. Matthews, 4th ed., Augener (Project
  Gutenberg #73023). https://www.gutenberg.org/files/73023/73023-h/73023-h.htm
- [AUE] L. Auer, *Violin Playing as I Teach It* (Stokes, 1921), Internet Archive text.
  https://archive.org/details/violinplayingasi00auer
- [GRS] E. J. Payne, "Shift", Grove *Dictionary of Music and Musicians* (1st ed.), Wikisource.
  https://en.wikisource.org/wiki/A_Dictionary_of_Music_and_Musicians/Shift
- [GRP] P. David, "Positions", Grove *Dictionary of Music and Musicians* (1st ed.), Wikisource.
  https://en.wikisource.org/wiki/A_Dictionary_of_Music_and_Musicians/Positions
- [WV] Wikipedia, "Violin" (pitch range, positions, open strings, double stops, harmonics,
  sizes). https://en.wikipedia.org/wiki/Violin
- [WVA] Wikipedia, "Viola". https://en.wikipedia.org/wiki/Viola
- [WC] Wikipedia, "Cello". https://en.wikipedia.org/wiki/Cello
- [WSL] Wikipedia, "Scale length (string instruments)". https://en.wikipedia.org/wiki/Scale_length_(string_instruments)
- [STL] The Strad / Thomastik-Infeld, "Stringtelligence: vibrating string length and string
  tension". https://www.thestrad.com/accessories/stringtelligence-by-thomastik-infeld-vibrating-string-length-and-string-tension/9132.article
- [TUN] Tunable, "Violin Position Chart: 1st Through 7th Position" (cites Galamian).
  https://tunableapp.com/instruments/violin/positions/
- [DAK] J. M. Dakon, "Basic Finger Patterns" (Bornoff/Barber lineage; violin, viola, cello,
  bass). http://jacobmdakon.weebly.com/finger_patterns.html
- [VO] Violin Online, "Violin Lesson Three – Violin Finger Patterns".
  https://violinonline.com/violinlesson_three.html
- [VFP] Violinist.com discussion, "Finger positions, not to be confused with hand position"
  (Ševčík semitone system). https://www.violinist.com/discussion/archive/5862/
- [VAF] Violinist.com blog, "Automated violin fingerings" (2016).
  https://www.violinist.com/blog/pooispoois/201612/20903/
- [KRU] P. T. Kruse, "Guidelines for Making Good Choices" (fingering), Violinist.com, 2019
  (quotes Flesch 1966, L. Mozart via Neumann). https://www.violinist.com/blog/PennyThompsonKruse/20198/27893/
- [PHI] L. Phillips, "Functional Fingering", *The Strad*, Sept 2018 (extract).
  https://www.thestrad.com/improve-your-playing/functional-fingering/8173.article
- [STS] R. Klopčič, "How to shift correctly on the violin", *The Strad* (2004; Galamian,
  Yankelevich, Dounis, Flesch quotes). https://www.thestrad.com/playing-hub/how-to-shift-correctly-on-the-violin/2939.article
- [STI] M. Lankovsky, "Intermediary notes are unnecessary for shifting" (Yankelevich), *The
  Strad*. https://www.thestrad.com/playing-hub/intermediary-notes-are-unnecessary-for-shifting/3097.article
- [SDS] *The Strad*, "6 ways to perfect your double-stops".
  https://www.thestrad.com/playing-hub/6-ways-to-perfect-your-double-stops/150.article
- [TER] J. White, "10 playing tips by violist Lionel Tertis", *The Strad*.
  https://www.thestrad.com/playing-hub/10-playing-tips-by-violist-lionel-tertis/11.article
- [EXT] S. Flavin, "Extend Yourself: How to Practice Extensions", *Strings*, Jan/Feb 2026.
  https://stringsmagazine.com/extend-yourself-how-to-practice-extensions-a-notoriously-tricky-technique/
- [GPS] D. Lecher, "'GPS' – 2.2 Shifting", Violinist.com (2007).
  https://violinist.com/blog/drewlecher/200712/7939/
- [DUM] K. Rapoport, "Intermediate-note shifts and finger-substitution shifts", *Violin For
  Dummies*. https://www.dummies.com/article/how-to-play-intermediate-note-shifts-and-finger-substitution-shifts-on-the-violin-143266/
- [SP2] StringPedagogy.com, "Stage One / Stage Two Shifting".
  https://stringpedagogy.com/members/volumes/vol_2/02_1c.htm, https://stringpedagogy.com/members/volumes/vol_2/02_2c.htm
- [FLN] Flesch on portamento (Japanese translation, note.com, 2025) — A- vs E-portamento.
  https://note.com/carlflesch/n/n9d0b66467276?hl=en
- [KEN] Kennedy Violins, "How to play a chromatic scale on violin".
  https://kennedyviolins.com/blogs/education-center/how-to-play-a-chromatic-scale-on-violin
- [VC1] Violinist.com discussion, "Chromatic fingering" (2010). https://violinist.com/discussion/archive/18131
- [VC2] Violinist.com discussion, "chromatic scales!" (2004). https://www.violinist.com/discussion/archive/5007/
- [VSM] Violinist.com discussion, "Viola & small hands" (2018).
  https://www.violinist.com/discussion/thread.cfm?page=1848
- [MF] M. Faw, "How to play Twinkle Twinkle Little Star on the Violin" (Suzuki).
  https://www.meghanfaw.com/beginner-violin-lessons/twinkle
- [BURI] S. Brivati ("Buri"), "Geminiani and the odd couple", Violinist.com (2006).
  https://violinist.com/blog/Buri/200611/6037/
- [BYU] D. Dalton, "The Viola & Violists", Primrose International Viola Archive, BYU.
  https://viola.lib.byu.edu/the-viola-violists
- [KAR] Carriage House Violins, "Scale System for Viola; Carl Flesch" (adapted by C. Karman);
  Internet Archive record (1942). https://www.carriagehouseviolins.com/cgi-bin/music/scripts/violin-viola-cello-music.cgi?itemno=VAFLESSCALECF ,
  https://archive.org/details/scalesystemscale00fles
- [IMS8] IMSLP, Ševčík *Changes of Position and Preparatory Scale Studies*, Op. 8.
  https://imslp.org/wiki/Changes_of_Position_and_Preparatory_Scale_Studies,_Op.8_(%C5%A0ev%C4%8D%C3%ADk,_Otakar)
- [WSE] Wikipedia, "Otakar Ševčík". https://en.wikipedia.org/wiki/Otakar_%C5%A0ev%C4%8D%C3%ADk
- [WFL] Wikipedia, "Carl Flesch". https://en.wikipedia.org/wiki/Carl_Flesch
- [WGA] Wikipedia, "Ivan Galamian". https://en.wikipedia.org/wiki/Ivan_Galamian
- [WGE] Wikipedia, "Francesco Geminiani". https://en.wikipedia.org/wiki/Francesco_Geminiani ;
  facsimile: https://imslp.org/wiki/The_Art_of_Playing_on_the_Violin,_Op.9_(Geminiani,_Francesco)
- [WDO] Wikipedia, "Demetrius Constantine Dounis". https://en.wikipedia.org/wiki/Demetrius_Constantine_Dounis
- [WSP] Wikipedia, "Louis Spohr". https://en.wikipedia.org/wiki/Louis_Spohr
- [WBA] Wikipedia, "Pierre Baillot". https://en.wikipedia.org/wiki/Pierre_Baillot
- [WSU] Wikipedia, "Suzuki method". https://en.wikipedia.org/wiki/Suzuki_method
- [WTE] Wikipedia, "Lionel Tertis". https://en.wikipedia.org/wiki/Lionel_Tertis
- [WPR] Wikipedia, "William Primrose". https://en.wikipedia.org/wiki/William_Primrose
- [WDS] Wikipedia, "Double stop". https://en.wikipedia.org/wiki/Double_stop
- Not fetched (cited via the secondary sources above): L. Mozart, *Treatise on the Fundamental
  Principles of Violin Playing*, tr. Knocker (OUP 1948/1985); Flesch, *Violin Fingering: Its
  Theory and Practice*, adapt. B. Schwarz (Barrie & Rockliff 1966); Yampolsky, *The Principles of
  Violin Fingering* (OUP 1967); Galamian, *Principles of Violin Playing and Teaching*
  (Prentice-Hall 1962); Ricci, *Ricci on Glissando* (Indiana UP 2007); Szigeti, *Szigeti on the
  Violin* (Dover 1979); S. Fischer, *Basics* (Peters 1997) and *Scales* (Peters 2012); Primrose,
  *Art and Practice of Scale Playing on the Viola* (1954); Dalton, *Playing the Viola:
  Conversations with William Primrose* (OUP 1988); Bornoff, *Finger Patterns* (1948); B. Barber,
  *Fingerboard Geography* (Alfred 2008).
