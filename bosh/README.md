# #044 Bosh — Line Rider tracks from a MIDI file

[044_bosh.html](../044_bosh.html) plans a Line Rider track for a piece of music so that Bosh, the
rider, lands on its notes: each chosen note gets a pad that he first touches on that note's frame.
Nothing is animated by hand or faked: the track is ridden by Line Rider's own physics, and the saved
`.track.json` rides the same in linerider.com and Line Rider Advanced.

## Physics ([physics.js](physics.js))

Line Rider 6.2 physics, rewritten after [lr-core](https://github.com/conundrumer/lr-core) (David Lu,
MIT), the engine of linerider.com: the 10 contact points and 7 scarf points of Bosh, 22 sticks
(8 of them bindings that let go of him when stretched too far, lr-core's endurance 0.057, and 2 that
only push apart), the joints that break the sled or unseat him, 40 frames a second, gravity 0.175 px/frame²,
6 iterations of constraints then collisions, lines found through the 14 px grid with its cells in
lr-core's order and each cell's lines newest first. The arithmetic is lr-core's, operation for
operation, so results are identical to the last bit, not just close (Line Rider is chaotic: a
difference of 1e-15 shows up as a different ride a few seconds later).

- [test/oracle.mjs](test/oracle.mjs) compares every point of every frame with lr-core itself: its
  three 6.2 test tracks (one with a crash, one of 645 lines) and generated full-length tracks
  (Für Elise 6,796 frames … Toccata and Fugue in D minor 20,317 frames and 16,104 lines, with red-lined
  loops) are identical
- Mutable and allocation-free per frame: 0.2–0.6 M frames a second in Node on an M-series Mac
  (dense tracks to free flight); lr-core is immutable and keeps every frame, so checking several long
  tracks in one process runs out of Node's default heap

## Which notes ([music.js](music.js))

Onsets within 35 ms are one event, weighed by metre (downbeat, beat, half beat, from the file's
time signatures), a new note on top (the melody), loudness, chord size and the time to the next
onset (more so with *Excitement*). Dynamic programming picks the best set at least *Min gap* apart
for the *Landings* rate asked (the cost of a landing is found by bisection), with long silences
between landings discouraged. A run-up of 1.75 s goes before the music. Each landing also gets the
melody's height around it (semitones from the piece's middle) and the energy of the music around it
(notes a second and loudness over ±2 s, ranked within the piece: its quietest passages 0, its
loudest 1).

- **Loops** (`markStructure`): bars are cut at the downbeats and compared by their notes on a
  48-step grid (exactly, or as a shape from the bar's lowest note, so sequences count); a bar that
  plays the one before (or the one before that) again marks both first notes, and so does a fast
  run (6+ notes ≤ 0.2 s apart) sweeping 10+ semitones. Such a note is worth a bonus if nothing is
  landed on for 1.7 s after it — the time to go round — and becomes `move: 'loop'`
- **Take-offs**: before a landing at least 0.7 s after the last one, the note to leave the ramp
  on: salient, and about 60 % of the gap before the landing (`takeoff`)
- **Echoes**: a bar that comes back like an earlier one points each landing at the earlier one, so
  it gets the same kind of move

## Planning ([planner.js](planner.js))

A beam search over landings (4 runs kept). From Bosh on the pad he just landed on, it tries
shapes built as smooth curves ([geometry.js](geometry.js): curvature easing in and out, no kink
where a straight meets a bend, cut into lines of at most 6 px and 3°):

- **kickers**: on straight, then a curve up (pulling 2–6 × gravity at his speed) to an exit angle,
  then a straight exit so he leaves without spinning; flights around the natural flight time
  `2 v sin(-φ) / g` of that angle
- **dives**: down a steeper slope first, then up: the speed for a big jump or a loop
- **drops**: on, and off the end onto the next pad
- **climbs**: uphill and over a rounded crest, his speed turned into height
- **loops**: from a pad he lands on while still climbing, most of a circle up and over, and out
  steeply (62–88°) so the way out passes under the pad he came in on. Line Rider loses most of a
  rider's speed in a loop (each frame's collision takes off the part of his velocity the curve turns
  away: entered at 7 px/frame he reaches the top of a 24 px loop at 2). Without red lines they are
  small (22–34 px) and need him at 6+ px/frame from a dive; with them, the climbing 55 % of a 38 or
  48 px loop is red, as Line Rider builders do (entered at 5 px/frame, a 45 px loop's top is passed
  at 6.5–7.4), and there are about three times as many

With a take-off note, the shape's run-up length is solved by bisection (a longer run-up is a later
take-off) so the last frame he touches the lip is the frame before the note. Each candidate is
simulated frame by frame up to the next note. On the note's frame, a pad goes where he is about to
be: across his lowest point, halfway between where it is on the frame before and where it would be
on the frame, at an angle 9–22° under his direction (harder for stronger notes), flat under the
sled, or onto a loop's wall if the next move is a loop. Then that is simulated too. It must be
touched first on exactly that frame, and he must survive 5 frames on a run-out.

**Speed.** By default there are no red (acceleration) lines at all: his speed comes only from
gravity and the track — on the ground it changes by g sin θ a frame (measured: 0.99 × downhill,
1.00 × uphill), drops speed him up, climbs and hard landings slow him down. The music still sets
the pace it wants (*Speed*, from the energy above), but asks it of the slopes: height is the only
store of speed (v² changes by 2 g Δh), so a pace below what is wanted moves the landing heights down
by 0.6 × (v² − v_want²) / 2g (up to 90 px), a pace above moves them up, and pad angles steeper
(less of a bump, downhill after) or flatter (more of his speed taken off) are tried. His pace over a
move follows the music's energy with r = 0.40 in Rondo alla Turca and 0.65 in Beethoven's 5th
(0.51 / 0.85 over a few landings); before, with a flat target met by red pads, it was 0.15 / −0.29.
With *Red lines* on, pads can be red (accelerating, or braking: drawn backwards and flipped) and
loops are red-lined, as before. A candidate is thrown out if he crashes, stalls, goes over 15–18 px/frame (squeezed between
lines and shot out: real physics, but silly), touches an old line, or if a new line would catch him
anywhere he has already been from its solid side (passing through from behind is how jumps into
loops work). The cost mixes: time in the air against the gap, landing height against the melody's
contour from the last landing (*Pitch → height*), speed against the music's energy (*Speed*), how
high he flies (*Excitement*), binding stress, the sled's angle against the pad's, landing angle and
steepness, loops wanted and made, take-off notes missed, and moves unlike the echoed bar's.

Before a run is kept, the stretch its new lines could reach is ridden again from far enough back
and compared bit for bit (`pastIntact`), so no line ever changes what Bosh already did. At the end
the whole track is ridden again from the start ([`verifyPlan`](planner.js)): every pad first
touched on its frame, every timed take-off leaving the lip on its frame and touching nothing until
the landing; the page rides the saved track data once more to show its check.

Results (Landings 1.8/s × (1 − 0.3 × excitement), Min gap 0.25 s, Excitement 60 %, loops and
take-offs on, **red lines on**; Node, M-series Mac; without red lines the landings and take-offs are
as exact, with fewer loops, e.g. Rondo 279 / 279, 111 / 111, 2 loops; Toccata 740 / 740, 94 / 94, 1 loop):

| Piece | Ride | Landings on their frame | Take-offs on their note | Loops (asked) | Highest jump | Lines | Planned in |
|---|---|---|---|---|---|---|---|
| Beethoven – Für Elise | 2:50 | 243 / 243 | 81 / 81 | 0 (4) | 28 px | 4,264 | 3.1 s |
| Mozart – Rondo alla Turca | 3:14 | 279 / 279 | 110 / 110 | 8 (18) | 90 px | 6,099 | 4.0 s |
| Chopin – Minute Waltz | 1:36 | 134 / 134 | 14 / 14 | 1 (9) | 29 px | 2,582 | 1.6 s |
| Rush E | 2:22 | 202 / 202 | 83 / 83 | 1 (5) | 32 px | 3,633 | 3.4 s |
| Debussy – Clair de lune | 4:10 | 361 / 361 | 57 / 57 | 1 (5) | 49 px | 6,613 | 4.9 s |
| Beethoven – Symphony No. 5, I | 6:36 | 577 / 577 | 61 / 61 | 5 (22) | 73 px | 11,382 | 8.5 s |
| Bach – Toccata and Fugue in D minor | 8:28 | 741 / 741 | 88 / 88 | 8 (24) | 75 px | 14,531 | 11.1 s |

None crashes. In the Rondo the loops come in pairs over the repeated bars (17 and 21 s, 29 and
32 s) and again when the section returns (124 and 128 s, 138 and 141 s).

What physics allows: at 40 fps and 0.175 px/frame², a hop of t seconds rises at most about
35 t² px if it lands where it took off (a 0.4 s gap: about 5 px; Bosh is 17 px long). So in fast
passages he skims over stepped pads, and only gaps of a second or more give real jumps. Rising
melodies need kickers and cost speed, falling ones are free. About a third of the loops asked for
are made: a loop needs him climbing at 4.6+ px/frame onto its wall on the note, with 1.7 s free after.

## Drawing ([render.js](render.js))

Lines black on paper (or light on night); runs of joined lines drawn as one smooth stroke (quadratic
curves through the midpoints, within a hundredth of a pixel of the lines he rides); each pad in its
note's pitch-class colour, glowing for 0.3 s when he lands on it; a ring from the lip when he takes
off on a note; red lines with a rail and chevrons the way they push; Bosh with his sled, hat and
striped scarf; his trail over the last 2 s; his speed along the bottom strip; a camera decided in advance (his centre 0.35 s ahead,
eased both ways so it neither lags nor overshoots, zooming out to 0.4× when the seconds around
spread wide, for loops and big jumps); and a strip of the landings along the bottom.

## Page

Song or MIDI file (or a `.track.json`, to watch any track ride), *Landings*, *Min gap*,
*Pitch → height*, *Excitement*, *Loops*, *Take-offs on notes*, *Red lines*, *Speed*, *Take* (seed) and *Beam*,
then Generate (in a worker, about 1.3 s a minute of music); *Auto zoom*. Save .track.json for linerider.com / LRA: the music starts at the run-up time given in
the track's description. Settings in the address bar.

## Tests

- `node --test bosh/test/bosh.test.js` (10): every frame of four tracks against lr-core's hashes in
  [test/fixture.json](test/fixture.json) (a crash, red and flipped lines, two planned tracks, one
  with loops), lines and grid, `.track.json` round trip, landing choice, smooth curves, loop and
  take-off notes, every planned landing on its frame, gaps of 0.25–3 s, take-offs on their frames
  and a loop ridden over the top, and without red lines only plain lines, his change of speed
  going with the slope (r > 0.6)
- `node bosh/test/oracle.mjs --lrcore <node_modules/lr-core> <track.json> …` against lr-core itself
  (`npm install --ignore-scripts lr-core@0.8.2` outside the repo); `make_fixture.mjs` remakes the fixture
- `node bosh/test/browser.mjs song=midis/elise.mid` runs the page in Chromium and saves screenshots;
  `node bosh/test/sheet.mjs <track.json> <pads.json> <out.png>` draws a contact sheet of landings
  (both need playwright-core: `PLAYWRIGHT=…/playwright-core/index.mjs`)

Not yet: video export, scenery, the other set pieces of hand-made tracks (tubes, bounces off
ceilings, quarter pipes), and checking a saved track in linerider.com itself (it runs lr-core's
physics; the test above is against lr-core).
