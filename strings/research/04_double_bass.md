# 04 — Double bass: geometry, fingering systems, posture, test cases

Input for extending `strings/fingering.js` (state per note: string + frame base `b`, the
semitones of finger 1 above the open string, + finger, with a per-finger offset table) to the
double bass, and for animating a bassist's left hand, bow and posture.

- Pitches are scientific notation with MIDI numbers (C4 = 60), **sounding** pitch unless marked
  *written*. Bass parts are written an octave higher than they sound (§1.2); written pitches
  quoted by sources are converted.
- Strings E A D G. In bass books Roman string numbers are I = G … IV = E [EE][V]; Roman
  *position* numbers are Simandl's (§2.2).
- `G2@b5` = G string, finger 2, frame base 5. `T` = thumb as a stopping finger, `0` = open.
- Tags: [V] checked against a source fetched this session ([V, forum] / [V, snippet] = forum
  post / search-result text only); [T] standard pedagogy not re-fetched; [?] unverified or
  disputed; [calc] computed here from §1.5.

---

## 0. Ten-line summary

1. Tuned in fourths, E1 A1 D2 G2 = MIDI 28 33 38 43, written an octave up [WDB][V]. A 3/4 bass
   has a ≈1050 mm string, 3.2× the violin's [GOL][V].
2. The low-position frame spans a **whole tone**: fingers 1-2-4 at 0, +1, +2, with 3 and 4 moving
   as one digit (Simandl 1881) [WSI][PAT][V]. That whole tone (102 mm in I) is wider than the
   cello's minor-third frame (98 mm) [calc].
3. Three notes per string per position, so shifts are routine (one every few notes, semitone
   shifts on one finger included). Shift costs must be far lower than the violin's [PAT][V].
4. Simandl's positions ½ I II II½ III III½ IV V V½ VI VI½ VII are a semitone apart, b = 1…12:
   seven full + five half positions up to the octave [PAT][TBP][JM][V].
5. Near the neck heel finger 3 replaces 4 (frame 1-2-3 at 0, +1, +2). Sources put the switch where
   the top note is +8 to +12 above the open string [PAT][TB1][FRE][V].
6. From the octave (b = 12) the thumb stops notes. Petracchi's three thumb frames T-1-2-3 span a
   minor third, major third or perfect fourth; 4 is rarely used; low thumb reaches down to +7
   [DBH-P][NTB][PAT][V].
7. Style alternatives: Italian 1-3-4 (Bottesini, Billè) [PAT][TB2][V]; open hand 1-2-3-4 over a
   minor third (Franke, Karr, Morton's "extension fingering") [PAT][TB3][V]; Rabbath's six
   harmonic-node positions with the pivot (thumb fixed, reach a minor/major third) [PAT][DBH-R][V].
8. Open strings are used more than on the violin (beginners, fast and jazz playing), but Morton
   says avoid them in lyrical playing and never two in a row [PAT][UNB][V].
9. Morton's shift rules: ≥ 2 notes per position; shift on a semitone, ideally same finger;
   shortest travel; shift early; in running notes shift on the weak note [PAT][V].
10. Posture: thumb behind the neck about opposite finger 2, rounded fingers, elbow floating; bass
    turned ~45° and leaning on the player; nut at eye/eyebrow height; French bow held like a cello
    bow, German bow palm-up like a viol bow [JM][IUP][WDB][V].

---

## 1. Instrument

### 1.1 Tunings [WDB][JM][V]
| Setup | Strings | MIDI | Notes |
|---|---|---|---|
| Orchestral | E1 A1 D2 G2 | 28 33 38 43 | "the only modern bowed string instrument that is tuned in fourths" |
| 5-string, low B | B0 E1 A1 D2 G2 | 23 + above | "several major European orchestras" |
| 5-string, low C / high C | C1 + E…G / E…G + C3 | 24 / 48 | high C for solo tessitura |
| C extension | E string down to C1 | 24 (gates at 25–28) | "Most professional orchestral players use four-string double basses with a C extension"; wooden or metal "fingers" at C♯ D E♭ E, or fingered by reaching over the scroll |
| Solo tuning | F♯1 B1 E2 A2 | 30 35 40 45 | a tone up, lighter strings; solos published for both tunings |
| Fifths (Red Mitchell, Quarrington) | C1 G1 D2 A2 | 24 31 38 45 | rare |

Solo-tuning parts are usually notated as if in orchestral tuning [?]: expose `tuning`, don't detect.

### 1.2 Notation
Notated "an octave higher than it sounds", also in tenor and treble clef; Italian solo music is
often at sounding pitch [WDB][V]. GM files store sounding pitch (open E = 28). Offer a "written
pitch" switch instead of guessing.

### 1.3 Sizes [GOL][V]
| inches (cm) | 4/4 | 3/4 | 1/2 | 1/4 |
|---|---|---|---|---|
| Full height, body bottom → scroll | 74.8 (190) | 71.6 (182) | 65.7 | 61.4 |
| Body, bottom → shoulder | 45.7 | 43.7 (111) | 40.2 | 37.4 |
| **Scale, nut → bridge** | 43.3 (110) | **41.3 (104.9)**; Kay 41.5 | 38 (96.5) | 35.4 (89.9) |
| Upper / lower bout | 21.3 / 26.8 | 20.3 / 25.6 | 18.7 / 23.6 | 17.3 / 21.9 |
| Scroll → shoulder | 29.1 | 27.9 | 25.5 | 24.0 |
| Neck width at nut | 1.8 | 1.7 | 1.6 | 1.5 |

"An 'average' 3/4 size bass has a scale length … 41-42 inches with an afterlength … around seven
inches"; there are no standards [GOL][V]. A maker builds 7/8 basses at 41½–42 in [TB4][V, snippet].
A 1/2 bass is "only about 15% smaller" than a 4/4 [WDB][V]. Bow 60–75 cm [WDB][V].
**Default L = 1050 mm.**

### 1.4 Body (3D) [WDB][V]
Violin form or viol (gamba) form, rarer busetto and pear shapes; carved round back or flat back
angled at the top. **Sloped shoulders** meet the neck in a curve, so the player can lean the bass
and reach the high register. Proportionally deeper body; curved bridge; fingerboard flattened
under the E string (Romberg bevel); metal worm-gear machines; thick endpin; tailpiece on a cable.

### 1.5 Frame widths [calc]
`d(n) = L·(1 − 2^(−n/12))`, L = 1050 mm:

| b | 1 (½) | 2 (I) | 5 (III) | 7 (IV) | 9 (V½) | 12 | 17 | 24 |
|---|---|---|---|---|---|---|---|---|
| d(b) mm | 59 | 115 | 263 | 349 | 426 | 525 | 657 | 788 |
| semitone | 56 | 52 | 44 | 39 | 35 | 29 | 22 | 15 |
| whole tone (Simandl 1→4) | 108 | **102** | 86 | 77 | 68 | 57 | 43 | 29 |
| minor third (open hand 1→4) | 158 | 149 | 125 | 112 | 99 | 84 | 63 | 42 |
| perfect fourth (T→3 diatonic) | 249 | 235 | 197 | 176 | 157 | 132 | 99 | 66 |

Violin P4 frame at a = 2: 73 mm; cello minor third at a = 2: 98 mm. The open-hand minor third
only shrinks to the low Simandl width near b = 9–10, which fits Morton's advice to use extension
fingering "particularly in upper neck positions" [PAT][V]. The 1st-position whole tone is 87 / 94
/ 102 / 107 mm on 1/4, 1/2, 3/4, 4/4 basses.

### 1.6 Landmarks
- **Neck heel.** With the thumb in the crook, finger 1 is on D on the G string (b = 7) on a "D neck",
  on E♭ (b = 8) on an "E♭ neck" [TB5][V, snippet]; some define it by finger 4 instead (b = 5/6) [?].
  Suzuki's "neck block" start is marked "4th Pos." [SUZ][V] and Gale calls IV the "D or neck heel
  position" [TBP][V]: default **heel = 7**.
- **Octave, b = 12**, the half-string point (525 mm) [calc]: "Thumb position starts on the middle
  harmonic" [JM][V].
- Morton's registers: "neck" = ½–IV (b 1–7), "crook of the neck" = V–VII (b 8–12), "thumb" above
  [PAT][V].

### 1.7 Range
- Lowest E1 41 Hz, C1 33 Hz, B0 31 Hz. Fingerboard top "near D5, two octaves and a fifth above …
  the G string" (+31) [WDB][V].
- Orchestral parts "rarely" exceed **E1–G3** (G string +12), occasional A3 (+14); Prokofiev's
  *Lieutenant Kijé* reaches D4, E♭4 (+19, +20) [WDB][V].
- Simandl "does not use the low E string in higher positions" (high gut strings) [WDB][V]. Orin
  O'Brien: with gut, thumb position above the octave on D, A, E made the bow touch the next open
  string, so solo playing went "up & down the G string" [DBH-T][V].
- Suggested `maxB` [T][calc]: E 9, A 12, D 19, G 26 (traditional profile: 7, 9, 12, 26).

### 1.8 Harmonics [calc]
Nodes: 1/2 at +12 (sounds +12); 1/3 at +7.02, +19.02 (sounds +19); 1/4 at +4.98, +24 (+24); 1/5 at
+3.86, +8.84, +15.86, +27.86 (+27.86). They are Rabbath's anchors (§2.7); orchestras tune by
harmonics [WDB][V]; scales often end on the octave G harmonic (§4.3) [FRE][V].

---

## 2. Fingering systems

### 2.1 Simandl (German / Viennese) [WSI][PAT][JM][V]
- "the first, second, and fourth fingers … (the third and fourth operating together as one digit)"
  in the lower register; Book II (ed. Lyman) is thumb position [WSI][V].
- Mick: "m2 between 1^2 and 2^4 = M2 between 1 – 4. 3rd finger used in thumb position. Thumb used
  in place of 4th finger in thumb position … Shift = move the 1st finger/hand a m2 or more. Pivot =
  roll the hand on the thumb to reach a m3" [JM][V].
- "The main point about Simandl is that it NEVER uses 1234" [TB1][V, forum]. Hause (1807) first wrote
  down 1-2-4; Sperger used 1-2-4 low and 1-2-3-4 from the fourth above the open string [PAT][V].

### 2.2 Position names → b
A full position has finger 4 on a natural of C major on the G string, a half position on an
accidental [TBP][V]; "G-string = I (A), II (B♭), III (C), IV (D), V (E♭); ½ (A♭), II ½ (B), III ½
(C♯), V ½ (E)" [JM][V]. Simandl's original: "eight positions … half … to the seventh … plus four
intermediate positions … twelve"; Sankey renumbers each semitone "half position to the eleventh"
[PAT][V], i.e. Sankey = b − 1 [calc], matching a forum "8 position" for 4 on F♯ [TB1][V, forum].

| b | Simandl | Rabbath | Finger 1 on E A D G (MIDI) | G string 1, 2, 4 |
|---|---|---|---|---|
| 1 | ½ | – | 29 34 39 44 | A♭ A B♭ |
| 2 | I | 1st | 30 35 40 45 | A B♭ B (45 46 47) |
| 3 | II | 1st + pivot | 31 36 41 46 | B♭ B C |
| 4 | II½ | 1st + pivot | 32 37 42 47 | B C C♯ |
| 5 | III | 2nd | 33 38 43 48 | C C♯ D (48 49 50) |
| 6 | III½ | 2nd + pivot | 34 39 44 49 | C♯ D D♯ |
| 7 | IV (heel) | 3rd | 35 40 45 50 | D E♭ E |
| 8 | V | 3rd | 36 41 46 51 | E♭ E F |
| 9 | V½ | 3rd | 37 42 47 52 | E F F♯ |
| 10 | VI | 3rd | 38 43 48 53 | F G♭ G (1-2-3, §2.3) |
| 11 | VI½ | 3rd | 39 44 49 54 | F♯ G G♯ (1-2-3) |
| 12 | VII / thumb | 4th | 40 45 50 55 | G A♭ A (1-2-3), or T on the octave |

b = 1, 2 on every string and b = 5 on G are on Silliman's chart [SIL][V]; G-string names from
[JM][TBP][TB1][V]; other cells [calc]. Billè names half positions by spelling (A♯ "first advanced",
B♭ "second backward") [PAT][V]: keep b internal, names for display.

### 2.3 The 4 → 3 switch
| Source | Rule (above the open string) |
|---|---|
| Forum summary of Simandl [TB1][V, forum] | 1-2-4 "up to the 4th finger on the F♯" (+11, b = 9); 1-2-3 "until the 3rd finger on the A" (+14), "until 1st on the octave G"; then T-1-2-3 |
| Morton, *Concepts and Ideas* [PAT][V] | 3 not 4 "from E♭4 till F♯4" (written: +8…+11); avoid 4 above E♭4 written |
| Morton, *Primer* [PAT][V] | 3 instead of 4 "from a major six above the open string" (+9) |
| Nanny 1920 [PAT][V] | 1-2-4 to "6th position (9th degree)", 1-2-3 from the 10th degree; whole tones 1-4 in positions 1–5, 1-3 from 6 (degree ≈ b [?]) |
| Freides [FRE][V, forum] | 2-4 "thumb behind neck" to F♯ (+11); 2-3 "thumb at side of neck" for A♭, A (+13, +14) |

Consensus [calc]: 4 normal while its note is ≤ +9, contested at +10/+11, 3 from +12. One may
"transition to 123 a few positions early, especially if your 4th finger is a bit short" [TB1] →
the hand-size option.

### 2.4 Italian 1-3-4 (Bottesini, Billè) [PAT][TB2][V]
Asioli (1823) → Bottesini's *Metodo* (1869) → Billè's *Nuovo metodo* (1922), still standard in
Italy. "In the first position on the d-string they will use finger 1 for e, finger 3 for F and
finger 4 for F♯" [TB2]. Billè: change position whenever an ascending scale reaches C, E or G on a
string; "the last half tone has always to be played by the 3rd and 4th fingers", a mid-scale half
tone by 1-3 [PAT]. Critics: 3 is the weakest finger [TB2]. Frame 1: 0, 3: +1, 4: +2.

### 2.5 French school: Nanny [PAT][V]
Eight positions of two degrees (14, one past Simandl/Billè, to B on the G string); 1-2-4 low
(his F- and G-major one-octave scales match Simandl), 1-2-3 high, thumb from the 7th position.

### 2.6 Open hand 1-2-3-4 (minor third) [PAT][TB3][V]
Franke (1820), Dragonetti, Gale's "open hand", "the Karr technique", Morton's "extension", Wolf's
"four-finger system", Pedersen. Morton: Simandl ("regular") for lyrical playing, especially low;
extension for fast playing, especially high [PAT]. Gale's "Triangulation" interleaves closed hand,
open hand and thumb [TB3]. Players use "a pivoting or rolling movement … since statically
maintaining such a wide stretch may overstress the hand" [TB3]. Sankey's Simandl edition has an
appendix on extensions, finger 3 and low thumb [TB1][V, forum]. Edgar Meyer's and Streicher's
systems were not verified [?]; Streicher's method is listed among those "evolving from the Simandl
technique" [PAT][V].

### 2.7 Thumb position [WDB][DBH-T][DBH-P][NTB][PAT][V]
- "shifts the hand from behind the neck and flattens it out, using the side of the thumb to press
  down the string … few players use the fourth (little) finger" [WDB].
- The thumb is a movable capo: "open – 1 – 4 … in thumb position, we use thumb – 1 – 3" [DBH-T].
- Petracchi, *Simplified Higher Technique*:

| Frame | Steps T→1, 1→2, 2→3 | Offsets T 1 2 3 | Span | T on G3 (55) |
|---|---|---|---|---|
| Chromatic | ½ ½ ½ | 0 1 2 3 | m3 | 55 56 57 58 |
| Semi-chromatic | 1 ½ ½ | 0 2 3 4 | M3 | 55 57 58 59 |
| Diatonic | 1 1 ½ | 0 2 4 5 | P4 | 55 57 59 60 |

- Morton [PAT]: semitone or whole tone T→1, semitones between fingers; avoid 1→2 whole tone when
  T→1 is a semitone; avoid 2→3 whole tone "if at all possible"; avoid finger 3 above E♭5 written
  (+20 on G); thumb usable down to a fifth above the open string (+7), not in lyrical passages.
- Low thumb "as low as D on the G string" (+7) [DBH-P]; one teacher on a 4/4 bass goes to written
  C♯ on the G string [NTB].
- "Put the thumb on G for everything you can" first [FRE]. Pedersen: enter thumb position as late as
  possible ascending, leave it as early as possible descending; no finger 4 [PAT].

### 2.8 Rabbath: positions, pivot, crab [PAT][DBH-R][DBH-S][JM][V]
| Position | G-string anchor | b | Node |
|---|---|---|---|
| 1 | finger 1 on A | 2 | – |
| 2 | finger 1 on C | 5 | 1/4 |
| 3 | finger 1 on D, thumb at the neck base, pivots to the octave | 7 | 1/3 |
| 4 | thumb on G | 12 | 1/2 |
| 5 | D | 19 | 2/3 |
| 6 | G ("harmonic position") | 24 | 3/4 |

- Vance's *Progressive Repertoire* starts in Rabbath 3rd = "traditional 4th position" with
  pentatonic tunes and reaches thumb position "within the first few tunes" [DBH-S].
- **Pivot:** thumb fixed, palm rocks, reaching "a minor third or even a major third" [PAT]; "pivot
  the hand a semitone either way" [TB1]. **Crab:** never lift a finger before the next is down; the
  hand closes ascending and opens descending; "the equivalent of the pivot in thumb position" [PAT].
- Rabbath also sets low string heights, moves the bow toward the bridge as the hand rises, and
  favours a bent endpin and the French bow [TB6][DBH-S][V].
- Engine [calc]: a pivot is a cost-free ±1 in b while a hidden thumb anchor stays put (≤ 2 st from
  it); or approximate with frame entries 1: −1 and 4: +3 at small cost.

### 2.9 Bows [WDB][IUP][V]
- **French:** like violin-family bows (popularised by Bottesini); "palm facing toward the bass",
  thumb on the shaft by the frog, fingers draped over.
- **German (Butler):** viol ancestry, taller frog, "palm angled upwards"; screw in the web of thumb
  and index, index on the stick at the frog, middle and ring fingers between stick and hair, little
  finger under the frog. Claimed to give more arm weight; both are used in major orchestras.

---

## 3. Shifting and string crossing

### 3.1 Morton's rules (*Concepts and Ideas*, 1991, via [PAT][V])
1. ≥ 2 notes per position (rests and open strings count; may be dropped in lyrical thumb position
   [MOR][V, snippet]).
2. Shift on a strong beat; in runs of equal notes on the weak note; with uneven notes in the shorter.
3. Shift by a semitone on one string, 4. with the same finger.
5. No same finger twice when crossing strings in legato.
6. Avoid open strings, especially lyrically; 7. never two open strings in a row (both ring).
8. Shortest hand travel. 9. In lyrical playing III–IV on lower strings beats ½/I with open strings.
10. Shift as soon as the passage allows. 11, 17. 3 instead of 4 from written E♭4. 12–16. thumb rules (§2.7).

Also: fingers 1-2 (2 preferred) for "money notes" [MOR]; "functional" (hidden) vs "expressive"
shifts; shifts have preparation, movement, follow-through, led by the elbow in the neck register
and the wrist in thumb position [PAT].

### 3.2 Other heuristics
- Pedersen: ascending onto the same or a lower finger (1→1, 4→1) is a *primary* shift into a new
  range; onto a higher finger (1→2, 2→4) a *secondary* shift (pivot-like); mirrored descending
  [PAT][V]. Secondary should be cheaper.
- "Shift before you reach the G string ascending … and shift down before you reach the E string
  descending", otherwise each new note on the outer string costs a shift [TB7][V, forum]. Some
  players prefer many small shifts, others few large ones [TB7]: acceptable sets, not one oracle.
- Drills cycle every finger pair 1-1 … 4-4 [JM][V]: all are legitimate shifts.
- Morton's "technical" style avoids shifts by crossing and open strings; the "lyrical" style stays
  on one string for an even tone [PAT][V]. Beginners stay in I with open strings [UNB][V].
- Strings a fourth apart [calc]: a position covers 0…+2 per string, leaving +3, +4 uncovered below
  the next open string; those need a shift, extension, pivot or the lower string. In half position
  G♯1 is unreachable on E [SIL][calc]. Each open string from A1 up equals finger 4 in II (b = 3) on the
  string below: the bass version of the violin's "4 on the lower string" choice.

---

## 4. Test oracles

### 4.1 Position maps [SIL][V]
| String | ½ (b = 1): 1 2 4 | I (b = 2): 1 2 4 |
|---|---|---|
| E (28) | 29 30 31 | 30 31 32 |
| A (33) | 34 35 36 | 35 36 37 |
| D (38) | 39 40 41 | 40 41 42 |
| G (43) | 44 45 46 | 45 46 47; III (b = 5): 48 49 50 |

### 4.2 One-octave scales
| Scale | MIDI | Fingering | Tag |
|---|---|---|---|
| D major, shifting | 38 40 42 43 45 47 49 50 | D0 D1 D4 G0 G1 G4 @b2, G2 G4 @b5 | [UNB][EE][V] |
| D major, beginner | 38 40 42 33 35 37 38 | D0 D1 D4 A0 A1 A4 D0 (top half an octave down) | [UNB][V] |
| G major from G1 | 31 33 35 36 38 40 42 43 | E2 A0 A1 A2 D0 D1 D4 G0 @b2 | Simandl/Nanny use I [PAT][V]; digits [calc] |
| same, Billè | | E3 A0 A1 A3 D0 D1 D4 G0 | [PAT][V]; [calc] |
| F major from F1 | 29 31 33 34 36 38 40 41 | E1 E4 A0 A1 A4 D0 D2 D4 @b1 | half position [PAT][V]; [calc] |
| B♭ major from B♭1 | 34 36 38 39 41 43 45 46 | A1 A4 D0 D1 D4 G0 G2 G4 @b1 | [calc] |
| C major from C2 | 36 38 40 41 43 45 47 48 | A2 D0 D1 D2 G0 G1 G4 @b2, then C3 as G1@b5, G2@b4 or G4@b3 | [calc], acceptable set |
| A major on the G string | 45 … 57 | positions only rise: 1-2-4 to F♯, 1-2-3 above (Sankey I→11th, Billè I→VII) | [PAT][V] |

### 4.3 Two-octave endings on the G string (Freides) [FRE][V, forum]
| Top | MIDI | Fingers | Frame |
|---|---|---|---|
| E | 51 52 | 2 4 | b = 7 |
| F | 52 53 | 2 4 | b = 8 |
| F♯ | 53 54 | 2 4 | b = 9 |
| G | 52 54 55 | 1 4, then 3 on the G **harmonic** | b = 9 + octave node |
| A♭ | 55 56 | 2 3 | b = 11 |
| A | 56 57 | 2 3 | b = 12 |
| B♭ | 55 57 58 | T 1 2 | thumb on G |
| B | 56 58 59 | 1 2 3 (T on G, silent) | T 0, +1 +3 +4 |
| C | 55 57 59 60 | T 1 2 3 | diatonic |
| C♯ | 56 58 60 61 | 1 2, 2 3 (hand slides a tone, thumb to A) | thumb shift |
| D | 55 57 59 61 62 | T 1 2, 2 3 | thumb shift |

Another teacher: "the last two notes of a 2-octave G, A♭, and A scales are fingered 2-3, then B♭ is
T-1-2, C is T-1-2-3" [TB8][V, snippet]: agrees except G.

### 4.4 Method books
- **Suzuki Bass School 1** (revised): an optional start "at the neck block" marked "4th Pos." (b = 7),
  or Twinkle "in first position" [SUZ][V]. Extracted digits are only 0, 1, 4; the key was not
  extracted [?] (D assumed in B19/B20; in A the same shapes move a string down).
- **Essential Elements 1**: "A on G String", D major with "Bass Shifting", "Bass C♯ on A string",
  "New Position II", "II ½", "Bass 3rd Position" [EE][V].
- **Vance/Rabbath**: starts at Simandl IV [DBH-S][V].
- **Chromatic**: no bass source found. Morton rules 3–4 + §4.1 give E1→A1 = E0 E1 E2 E4@b1, E4@b2, A0
  [calc]. Thumb position on G, from the thread's first poster: "Thumb G / F1 G♯ / F2 A / F3 A♯ and
  after I shift the thumb to the B" [FRE][V, forum].
- **Orchestral excerpts**: none fingered was fetched. Named in [WDB][V]: Beethoven 5 (scherzo), 7,
  9 (recitative), Mahler 1 (3rd mvt), Prokofiev *Kijé*, Saint-Saëns *Elephant*, Britten.

---

## 5. Posture and motion

**Left hand, neck.** "Thumb in middle of neck"; bass "K" (gap between 1 and 2); "rounded finger";
"straight wrist (elbow floating above heel)" [JM][V]. Simandl: thumb "perpendicular to the neck and
more or less opposite the middle finger", shifting "without rotating or pivoting the thumb" [TB9][V,
snippet]; others say opposite fingers 1–2 [XF][V, snippet]; some jazz players wrap the palm round the
neck [TB10][V, snippet]. Animate finger 3 pressed down beside 4 in the low positions [WSI]. "The thumb
always travels with the hand" [FO][V]. Fingertip span 102 mm in I, 77 mm at the heel [calc].

**Thumb position.** Simandl: "placing that part of the thumb between the first joint and the nail
horizontally across the string"; 1 slightly curved on the tip, 2 less, 3 straighter [TB11][PAT][V].
Modern teachers raise the elbow ("the hand can come around and over the fingerboard in a much more
natural curve"), higher for lower strings, shoulder relaxed [DBH-E][TB11][V]; thumb "at a right angle
to the string", hand about 45° [DBH-T][V]. Going up: lean forward from the hips, raise the elbow, slide
the thumb from the back of the neck to its side and onto the string [PAT][V]; "let your bass neck rest
on your shoulder" [IUP][V]. Thumb across two strings for a fifth [T][?].

**Body.** The player "stands, or sits on a high stool, and leans the instrument against their body,
turned slightly inward" [WDB][V]; "turn the bass one quarter of a turn … about a 45-degree angle from
the body", tilted back onto the pelvic bone or stomach [IUP][V]. Endpin: nut "between hair line and
eyebrow" [JM][V], or eye level to forehead [SBO][V, snippet]; standing players may put 1st/half
position at eye level; stool ≈ inseam height [WDB][V]. Short players stop the bass turning with a toe
on the ribs [TB12][V, snippet]; Rabbath uses a bent endpin [DBH-S][V].

**Bow arm.** Bow "straight and even to the floor … straight to the bridge", wrist in line, arm weight
not muscle; "Your bow needs to go faster to play higher notes" [IUP][V]; contact point moves toward the
bridge as the left hand rises [TB6][V]. These map onto the #034 bow-speed / contact curves [calc].

---

## 6. Algorithms and datasets

- **No computational double-bass fingering model or fingering dataset** turned up in three searches
  [?]. 02_algorithms.md (Sayegh, Radicioni, Radisavljevic, TNUA HMM) applies unchanged.
- Abeßer, CMMR 2012: string number of bass-guitar notes from audio (inharmonicity features), F = .93
  for 4 classes [ABE][V].
- **IDMT-SMT-BASS-SINGLE-TRACK** (Fraunhofer): 17 electric-bass lines with onset, offset, pitch,
  **string and fret** per note, plucking and expression classes [IDMT][V].
- **DadaGP**: 26,181 GuitarPro songs, most with a bass track; 5- and 6-string basses supported; string
  and fret per note [DADA][V]. Useful for pizzicato string-choice priors, not arco fingering.
- Fretting-Transformer (T5 MIDI → tab) and its 2026 constrained-decoding follow-up are guitar-only
  [FT][GT26][V]; ProgGP generates bass tracks for composition [PROG][V].
- Consequence: no ground truth like TNUA. Tune against §4 and §7.4 and keep weights interpretable.

---

## 7. Recommended model

### 7.1 Instrument
```js
contrabass: { name: 'Double bass', open: [28, 33, 38, 43], strings: ['E', 'A', 'D', 'G'],
  L: 1050, maxB: [9, 12, 19, 26], frame: BASS_FRAME, program: 43, heel: 7, thumbFrom: 7,
  tunings: { solo: [30, 35, 40, 45], fiveB: [23, 28, 33, 38, 43], cExt: [24, 33, 38, 43] } }
```
GM program 43 (0-based) = Contrabass [T]. C-extension notes 24–27 are gate/open notes (finger 0, no frame).

### 7.2 Frame by zone (offset above finger 1: cost)
The engine's single per-instrument frame becomes `frameAt(b)` (or entries with `bMin/bMax`).

| Zone | b | Offsets (cost) |
|---|---|---|
| Neck, closed hand | 1–8 | 1: 0 (0), −1 (0.8 pivot); 2: +1 (0); 4: +2 (0), +3 (1.2 pivot/open hand); 3 alone: +1 (2.5; Italian 0, and then 2: +1 costs 1.5), +2 (1.5 open hand) |
| Crook of the neck | 9–11 | 1: 0; 2: +1; 3: +2 (1.0 → 0 from b 9 to 11); 4: +2 (0.3 → 2), +3 (1.5) |
| Upper neck, no thumb | 12–13 | 1: 0; 2: +1, +2 (0.8); 3: +2, +3 (0.6) |
| Thumb (b = thumb) | ≥ 12 | T: 0; 1: +1, +2; 2: +2 (0.3), +3, +4 (0.4); 3: +3 (0.4), +4, +5 (0.3); 4: +6 (3) |
| Low thumb | 7–11 | thumb table + 1.0 per note (+2.0 on long/lyrical notes) |
| Harmonics | – | nodes +5, +7, +12, +19, +24 → sounding +24, +19, +12, +19, +24; cheap when the hand is at b ≥ 9 |

Thumb as finger 5 with `b` = thumb base keeps Petracchi's table readable. Rabbath profile: anchors
b ∈ {2, 5, 7, 12, 19, 24}, pivot ±1–2 free of shift cost. Display: bass `positionName(b)` from §2.2,
"thumb" above; Sankey (b − 1) and Rabbath numbers as options.

### 7.3 Weights vs violin defaults (starting points)
| Weight | Violin | Bass | Why |
|---|---|---|---|
| `shift` | 0.94 | **0.4** | a shift every 3–4 notes is normal |
| distance unit | mm (L 328) | mm × 328 / L | else every bass shift costs ×3.2 |
| `shiftSemitone` | 0.998 | 0.5 | Morton 3 |
| `shiftSlide` (same finger) | 0.3 | 0.1 | Morton 4 |
| secondary shift | – | × 0.6 | Pedersen |
| one-note position | – | +0.8 (open strings, rests count) | Morton 1 |
| `open` | −0.075 | −0.3 (beginner −0.6, lyrical +0.3) | §3.2 |
| `openLong` | 1.6 | 1.0 (lyrical 2.5) | Morton 6 |
| two opens in a row | – | +0.5 | Morton 7 |
| `cross` | [0, .35, 5, 6] | [0, .25, 3, 6] | crossing replaces shifting in fast playing |
| `fourth` | 0.665 | 0 for b ≤ 8, then §7.2 | 4 is the normal top finger low down |
| `lowStringHigh` | 0.08 | E 0.6, A 0.25, D 0.1 | Simandl's high-E avoidance |
| `pos` | violin table | 0 for b 1–12; +0.3 / base above 12 (G string 0.1) | G is the solo string |
| thumb on a long lyrical note | – | +1.5 | Morton 16, money notes on 1-2 |

Profiles: `simandl`, `italian` (3 at +1 cheap, 2 dear), `rabbath` (pivot, anchors), `openHand`
(0 +1 +2 +3 cheap for b ≥ 5), `beginner` (maxB 5, cheap opens, no thumb).

### 7.4 Test cases (✓ exact oracle, ≈ acceptable-set member)
| ID | Input (MIDI) | Expected | Source |
|---|---|---|---|
| B1 ✓ | 45 46 47 | G1 G2 G4 @b2 | [SIL] |
| B2 ✓ | 34 35 36 (F-major context) | A1 A2 A4 @b1 | [SIL] |
| B3 ✓ | 48 49 50 | G1 G2 G4 @b5 | [SIL] |
| B4 ✓ | 38 40 42 43 45 47 49 50 | D0 D1 D4 G0 G1 G4 @b2, G2 G4 @b5 | [UNB][EE] |
| B5 ✓ | `beginner`: 38 40 42 33 35 37 38 | D0 D1 D4 A0 A1 A4 D0 @b2 | [UNB] |
| B6 ≈ | 31 33 35 36 38 40 42 43 | E2 A0 A1 A2 D0 D1 D4 G0 @b2 | [PAT], [calc] |
| B7 ✓ | B6, `italian` | E3 A0 A1 A3 D0 D1 D4 G0 | [PAT][TB2] |
| B8 ≈ | 29 31 33 34 36 38 40 41 | E1 E4 A0 A1 A4 D0 D2 D4 @b1 | [PAT], [calc] |
| B9 ≈ | 34 36 38 39 41 43 45 46 | A1 A4 D0 D1 D4 G0 G2 G4 @b1 | [calc] |
| B10 ✓ | 51 52 / 52 53 / 53 54 | G2 G4 @b7 / @b8 / @b9 | [FRE] |
| B11 ≈ | 52 54 55 | G1 G4 @b9 + octave harmonic (3); or G2 G3 @b11 | [FRE][TB8] |
| B12 ✓ | 55 56 | G2 G3 @b11 | [FRE][TB8] |
| B13 ✓ | 56 57 | G2 G3 @b12 | [FRE][TB8] |
| B14 ✓ | 55 57 58 | GT G1 G2 | [FRE][TB8] |
| B15 ✓ | 55 57 59 60 | GT G1 G2 G3 | [FRE][TB8][DBH-P] |
| B16 ✓ | 55 57 59 61 62 | GT G1 G2, then G2 G3 with T moved to 57 | [FRE] |
| B17 ≈ | 55 56 57 58 | GT G1 G2 G3 (chromatic frame) | [FRE][DBH-P] |
| B18 ≈ | 28 29 30 31 32 33 | E0 E1 E2 E4 @b1, E4 @b2, A0 | Morton 3–4 [PAT]; [calc] |
| B19 ≈ | 38 38 45 45 47 47 45 43 43 42 42 40 40 38 | D0 D0 G1 G1 G4 G4 G1 G0 G0 D4 D4 D1 D1 D0 | [SUZ] (key [?]) |
| B20 ≈ | B19, b fixed at 7 (neck block) | D0 D0 D1 D1 D4 D4 D1 G0 G0 A4 A4 A1 A1 D0 | [SUZ] "4th Pos."; [calc] |
| B21 ≈ | `simandl`: any note > 55 | not on E (nor A) while D or G can take it | E: [WDB]; A: [calc] |
| B22 ≈ | lyrical 40 42 43 42 40 (43 a long note) | D1 D4 @b2, 43 as D4@b3 (semitone shift on 4), back to b2; `beginner`: G0 | Morton 4, 6 [PAT]; [calc] |
| B23 ≈ | 55 57 59 (`simandl`) vs (`rabbath`) | thumb on 55 in both; Rabbath labels it position 4 | [PAT][JM] |
| B24 ≈ | 31 32 33 32 31, fast vs legato | fast: E2 E4 @b2, A0, E4 E2; legato: 33 as E4@b3 (semitone shift on 4, no open string) | Morton 4, 6 [PAT]; [calc] |

---

## References
- [WDB] Wikipedia, "Double bass" (raw wikitext). https://en.wikipedia.org/wiki/Double_bass
- [WSI] Wikipedia, "Franz Simandl". https://en.wikipedia.org/wiki/Franz_Simandl
- [PAT] M. Cavalli, *Double Bass and Electric Bass: The Case Study of John Patitucci*, doctoral thesis,
  Univ. of Évora, 2016 (ch. 2: Simandl, Billè, Nanny, Rabbath, Morton, Pedersen, Wolf, Petracchi).
  http://dspace.uevora.pt/rdpc/bitstream/10174/18726/1/Double%20Bass%20and%20Electric%20Bass%20The%20case%20study%20of%20John%20Patitucci%20Definitive%20Version%2025th%20July%202016.pdf
- [JM] J. Mick (Ithaca College), *Double Bass 101*, FMEA 2015 handout. https://flmusiced.org/flmusicapps/Sessions/Handouts/2015/3860_Double_Bass_101_-_Handout.pdf
- [SIL] T. Silliman, *String Bass Fingering Chart*, 2002. http://www.quia.com/files/quia/users/wildcatmusic/dbfc.pdf
- [GOL] Gollihur Music, Sizing FAQ; String Length Guide. https://www.gollihurmusic.com/faq/2-SIZES_DOUBLE_BASS_SIZING_FAQ.html ; https://gollihurmusic.com/string-length-guide/
- [UNB] "Teaching the D Major Scale to Beginner Double Bassists", *unbowing*, 2025. https://unbowing.substack.com/p/teaching-the-d-major-scale-to-beginner
- [EE] Hal Leonard, *Essential Elements for Strings 1* guide. https://www.halleonard.com/bin/PromoBandOrchestraEe1stringsguide2025.pdf
- [SUZ] *Suzuki Bass School* vol. 1 (revised). https://lincolnmiddleschoolorchestra.weebly.com/uploads/1/2/9/4/129456078/suzuki_double_bass_book_1.pdf
- [FRE] S. Freides et al., "3 octaves scales and thumb position", TalkBass, 2020. https://www.talkbass.com/threads/3-octaves-scales-and-thumb-position.1460009/
- [TB8] "Simplified Higher Technique by Petracchi question", TalkBass. https://www.talkbass.com/threads/simplified-higher-technique-by-petracchi-question.1449492/
- [TB1] "I don't get Simandl fingerings", TalkBass. https://www.talkbass.com/threads/i-dont-get-simandl-fingerings.935153/
- [TBP] T. Gale et al., "Positions explained", TalkBass. https://www.talkbass.com/threads/positions-explained.259649/
- [TB2] "1-3-4 vs 1-2-4 with beginners"; "Bottesini Method/Studies", TalkBass. https://www.talkbass.com/threads/1-3-4-vs-1-2-4-with-beginners.577869/ ; https://www.talkbass.com/threads/bottesini-method-studies.78325/
- [TB3] "4-finger, 3-finger, 2-finger systems?", TalkBass. https://www.talkbass.com/threads/4-finger-3-finger-2-finger-systems.271139/
- [TB4] "3/4, 4/4, etc.", TalkBass. https://www.talkbass.com/threads/3-4-4-4-etc.104124/
- [TB5] "D vs Eb necks"; "An Eb neck?", TalkBass. https://www.talkbass.com/threads/d-vs-eb-necks.242282/ ; https://www.talkbass.com/threads/an-eb-neck-a-db-neck.73260/
- [TB6] "Rabbath and Streicher", TalkBass. https://www.talkbass.com/threads/rabbath-and-streicher.47360/
- [TB7] "Scales and fingerings. Help needed!", TalkBass. https://www.talkbass.com/threads/scales-and-fingerings-help-needed.246170/
- [TB9] "double bass left hand", TalkBass. https://www.talkbass.com/threads/double-bass-left-hand.1439682/
- [TB10] "Left hand posture and thumb placement", TalkBass. https://www.talkbass.com/threads/left-hand-posture-and-thumb-placement.1352056/
- [TB11] "left hand fingers/thumb in thumb position", TalkBass (quotes Simandl II). https://www.talkbass.com/threads/left-hand-fingers-thumb-in-thumb-position.794869/
- [TB12] "Proper standing position", TalkBass. https://www.talkbass.com/threads/proper-standing-position.400094/
- [DBH-R] J. Heath, "Rabbath Positions", Double Bass HQ. https://doublebasshq.com/learn_posts/what-are-the-rabbath-positions-anyway/
- [DBH-S] J. Heath, "Rabbath vs Simandl", Double Bass HQ. https://doublebasshq.com/learn_posts/rabbath-vs-simandl-whats-the-best-double-bass-best-position-system/
- [DBH-P] J. Heath, "Petracchi's Simplified Higher Technique", Double Bass HQ. https://doublebasshq.com/learn_posts/mastering-petracchis-simplified-higher-technique-for-double-bass/
- [DBH-T] "Fundamentals of Thumb Position", Double Bass HQ. https://doublebasshq.com/learn_posts/the-fundamentals-of-thumb-position-for-double-bassists/
- [DBH-E] L. Pierce, "Elbow in thumb position", Double Bass HQ. https://doublebasshq.com/learn_posts/how-to-position-your-elbow-in-thumb-position-on-double-bass/
- [NTB] D. Stokes, "Three Types of Thumb Position", No Treble, 2015. https://www.notreble.com/buzz/2015/08/24/classification-of-three-types-of-thumb-position-on-the-double-bass/
- [MOR] M. Morton, *Simandl-Plus* guide (Scribd preview). https://www.scribd.com/document/921699834/Simandl-Plus-Mark-Morton
- [IUP] IUP String Project, "Checkpoints for Home Practice: Bass". https://www.iup.edu/musictheatredance/community-outreach/string-project/students/checkpoints-for-home-practice-bass.html
- [XF] X. Foley, "Left Hand Technique". https://xavierfoley.com/de/blogs/xavier-foleys-blog/left-hand-technique-for-double-bass-foundation-basics
- [SBO] StringBass Online, "How to Hold the Bass". https://www.stringbassonline.violinonline.com/howtoholdthebass.html
- [FO] K. Springer, *Bass Technique Phase 1*, Florida Orchestra. https://floridaorchestra.org/wp-content/uploads/2021/08/BassTechniquePhase1Booklet.pdf
- [ABE] J. Abeßer, "Automatic String Detection for Bass Guitar and Electric Guitar", CMMR 2012. https://cmmr2012.eecs.qmul.ac.uk/sites/cmmr2012.eecs.qmul.ac.uk/files/pdf/papers/cmmr2012_submission_70.pdf
- [IDMT] Fraunhofer IDMT, IDMT-SMT-BASS-SINGLE-TRACK. https://www.idmt.fraunhofer.de/en/business_units/m2d/smt/bass_lines.html
- [DADA] Sarmento et al., DadaGP, ISMIR 2021, arXiv 2107.14653. https://arxiv.org/abs/2107.14653
- [FT] Hamberger et al., Fretting-Transformer, arXiv 2506.14223. https://arxiv.org/abs/2506.14223
- [GT26] Note-event tokenization and pitch-validity constrained decoding for MIDI-to-tab, arXiv 2607.26440. https://arxiv.org/abs/2607.26440
- [PROG] ProgGP, arXiv 2307.05328. https://arxiv.org/abs/2307.05328
