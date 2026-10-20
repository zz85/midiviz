# How SWAM and the Joshua Bell Violin choose articulations

Research brief, 19 Oct 2026, for #034. The question: how do Audio Modeling's SWAM Solo Strings and Embertone's Joshua Bell Violin decide by themselves whether a note is played legato, détaché, staccato or with a slide, and what can #034 take from that?

Sources:
- the [SWAM Solo Strings v2.1 manual](https://images.equipboard.com/uploads/item/manual/109721/audio-modeling-swam-solo-strings-bundle-manual.pdf) and the Audio Modeling knowledge base ([legato](https://kb.audiomodeling.com/support/solutions/articles/206000082862-how-is-legato-executed-in-polyswam-), [portamento in fast runs](https://kb.audiomodeling.com/support/solutions/articles/206000050887), [velocity vs expression](https://kb.audiomodeling.com/support/solutions/articles/206000050973));
- for the Joshua Bell Violin (JBV), its [product page](https://embertone.com/instruments/joshua-bell-violin/), the [Sound On Sound review](https://www.soundonsound.com/reviews/embertone-joshua-bell-violin) and a [page-by-page walkthrough of the v1.1 manual](https://rwiiug.hatenablog.com/entry/Joshua-Bell-Violin). The manual itself is behind Scribd.

## 1. Both do it, from the same three cues

Both instruments are played live from a keyboard, and both read the same cues. SWAM's manual puts it in one sentence: "Staccato, legato, portamento and bow-change articulations are managed by a special algorithm which takes into account note velocity, the interval between the notes, and the time between note-off and the subsequent note-on."

| Cue | SWAM | JBV |
|---|---|---|
| **Overlap** (next note-on before this note-off) | legato inside one bow; with Mono SX, crossing to an adjacent string stops the old string (#034 has this) | true legato, from recorded transitions (three styles × intervals beyond an octave) |
| **Gap** (note-off, then note-on) | détaché: a new bow. After "a short interval" the next stroke starts on the Bow Start direction | bow change on every detached note |
| **Velocity of an overlapped note** | high: legato; low: portamento, slower the lower. The threshold is "Port/Leg Speed&Thresh" | quiet overlapped notes slide (portamento) |
| **Velocity of a detached note** | the attack's strength ("Accent", "Attack: Vel. Soft / Hard / Mix") | the dynamic and the attack; "Adaptive Shorts": velocity sets how short a staccato is |
| **Note length / release** | — | "Quick Release": a short note picks staccato / spiccato / ricochet samples, so it waits a "Global Lag Window" to see the note-off |
| **Repeated pitch** | — | a quick repeat becomes a "Rebow" (a new bow on the same note) automatically |
| **Speed** | — | "Adaptive Legato": the transition gets shorter the faster you play. "Speed" can drive any control |
| **Expression at zero** | an automatic bow change when the expression rests at 0 | — |
| **Chords** | "Auto" polyphony waits a short look-ahead to tell a double stop from a single note | "Multi-Stop Attacks": 3–4 notes roll (1-2, 2-1, 2-2, 1-1-2) with a set delay |

Both pay for the guessing with latency on a live keyboard. JBV's "Global Lag Window" waits for the note-off, and SWAM adds latency to staccato notes in Auto mode. Sound On Sound notes "a small lag … while the script figures out what's going on".

JBV's **Intuition** page adds tendencies on top of the rules, all randomised by sliders:
- slur vs bow variance: a legato pair is sometimes slurred and sometimes re-bowed;
- a portamento tendency on slow legato;
- vibrato on / off variance;
- a "constant dynamic movement" (a slow periodic swell);
- three pitch instabilities: at the attack, growing with speed ("pitch less accurate while playing fast"), and growing with the interval.

SWAM's comparable controls are Random Bow, Random Finger, Vibrato Random, Vibrato Fade-In and "Dynamic Transit." (the dynamic's shape through a legato transition).

## 2. Why their rules alone would not work for #034

The rules assume the MIDI carries the player's articulation in its note lengths: overlaps for slurs, gaps for separate bows. Our MIDI files don't. Over the 48 violin MIDIs in `violinist/midis/` (40,988 consecutive note pairs in the solo track):

| Next note starts … | share |
|---|---|
| before this one ends (overlap) | 1.9 % |
| exactly when it ends (touching) | **94.9 %** |
| after a gap under 15 % of the interval | 1.7 % |
| after a gap of 15–45 % | 0.6 % |
| after a longer gap | 1.0 % |

They are score exports (Mutopia, MuseScore, LilyPond): every note is written at its full value, so slurs, staccato dots and bowings are gone. The exceptions are a few files that shorten notes (Paganini's Caprice 24, half the notes; the Kreutzer, 7 % long gaps) and Bach's slow movements, where overlapping notes are voices in a chord. To SWAM, "touching" counts as détaché (note-off before note-on), so it would bow every note separately. That is the machine-gun result the manuals warn about.

So #034 has to infer articulation from the music, as a violinist reading an unmarked part would. In return it has what a live instrument doesn't: the whole piece in advance, so no lag window is needed and decisions can look ahead.

## 3. What #034 does today

- **Slurs:** `strings/motion.js` slurs fast single notes (under 0.2 s, joined within 30 ms) up to 4 per bow. Everything else is one bow per note, with a retake after rests over 0.6 s.
- **Short strokes:** `performance.js` gives strokes under 0.18 s a short attack and a bigger bite.
- **Portamento:** only on shifts, longer for slow notes.
- **Chords:** 3–4 note chords roll, low pair then high pair 60 ms later.
- **Humanize:** attack pitch error, larger after shifts.
- **Already taken from SWAM:** string-crossing mute, bow start / keep direction, bow lift, the expression lane.

Not there yet: the choice of how many notes share a bow, staccato and spiccato as kinds of stroke, re-bowing repeated notes, legato transitions whose speed follows the tempo, explicit articulation when a file does carry it, and pitch instability that grows with speed and interval.

## 4. Proposal: an articulation planner

A step between fingering and `buildMotion` that labels every note: slur group, stroke type and transition. Two layers.

**Layer 1: read the file when it says something** (SWAM's and JBV's rules, applied offline):
- overlap of a single-voice note → slur (`legato`);
- a clear gap → separate bow; the gap fraction sets the stroke: under 15 % détaché, 15–45 % staccato or martelé (by velocity), over 45 % spiccato when fast and quiet (JBV's Adaptive Shorts);
- an overlapped note with velocity well below its neighbours → portamento (SWAM's threshold);
- a CC64 sustain pedal in a string part (the Kreutzer, Beethoven Op. 30) → SWAM's "NoteOff Sustain".

**Layer 2: infer when the file is silent** (the 95 % case), from rules a violinist would use. Each rule needs checking against marked editions before it is trusted:
- **Bow budget.** A bow is about 65 cm, and détaché above about 8–10 strokes per second at mezzo-forte sounds like spiccato or tremolo. So in fast passages group notes into slurs of 2, 3, 4 or 8, aligned to the beat (the bar's meter from the MIDI's time signature). Today's rule "≤ 4 fast notes" ignores beats.
- **Separate bows for:** a repeated pitch (JBV's Rebow), a leap to a non-adjacent string, a long note after short ones, the first note after a rest, and the downbeat of a bar when the bow allows it.
- **Stroke type** by tempo and dynamic: slow → long détaché; 6–10 notes/s at p–mf → spiccato (off the string, Bow lift = off); at f → martelé (a bite and a stop on the string).
- **Transitions:** legato speed scales with the note's length (JBV's Adaptive Legato). Portamento joins shifts on slow expressive legato, at a set tendency (JBV's Portamento Tendency).
- **Tendencies:** a little slur / bow variance and portamento-tendency randomness (JBV's Intuition). Humanize gains speed and interval pitch instability.

**How to check it.** Mutopia's LilyPond sources for the same pieces contain the slurs and dots our MIDIs lost (`(` `)` slurs, `-.` staccato). That gives ground truth for nearly every file in `violinist/midis/` without hand labelling:
- the share of notes put in the same slur group as the score;
- stroke-type agreement;
- the TNUA-style per-note agreement already used for fingering.

A planner that reaches, say, 75 % slur agreement on Bach's Partitas would already be well beyond today's fixed rule.

**Effort.** Layer 1 is small: rules on durations and velocities, plus tests. Layer 2 with the LilyPond evaluation is the larger part: a slur parser for Mutopia `.ly` files, alignment to the MIDI notes, and rule tuning, probably a day.

## 5. What not to copy

- **Live-keyboard latency** (lag windows, look-ahead delays): we render from the score.
- **Key switches and the velocity-as-articulation conventions** of a keyboard player. Our input is a score, not a performer's MIDI, so velocity is often flat (the files above use 127 throughout or write dynamics in CC7).
- **JBV's recorded legato transitions:** that is sample data, not a rule. The hybrid engine's synthesized slur is our equivalent.

## 6. Status (19 Oct 2026)

Layers 1 and 2 are built (`strings/articulation.js`), with MusicXML / `.mxl` score input (`strings/score.js`). Mutopia's ground truth turned out to be unnecessary for a first check: the Bach Violin Dataset's MusicXML editions already carry slurs. The results are in [strings/README.md](../README.md#articulation-planner-and-score-input): planner F1 50 % / agreement 68 % against the fixed rule's 39 % / 60 %.

Since then:
- **Stroke types:** spiccato and martelé.
- **Repeats and marks under a slur:** a louré or portato pulse in one bow, or a re-bow as an option.
- **Slides from the plan:** score marks, quiet overlaps (the SWAM rule above), and an inferred slow legato leap about once every 6 s.
- **MuseScore input:** `.mscz` / `.mscx` read directly (3 and 4), checked against MuseScore's own MusicXML on the OpenScore string quartets.
- **LilyPond input:** Mutopia's `.ly` sources read directly, checked against the MIDI files LilyPond made from them (99.5 % of notes).

Details are in the strings README.
