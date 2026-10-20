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
  three 6.2 test tracks (one with a crash, one of 645 lines) and seven generated full-length tracks
  (Für Elise 6,796 frames … Toccata and Fugue in D minor 20,317 frames, 3,523 lines) are identical
- Mutable and allocation-free per frame: 0.2–0.6 M frames a second in Node on an M-series Mac
  (dense tracks to free flight); lr-core is immutable and keeps every frame, so checking several long
  tracks in one process runs out of Node's default heap

## Which notes ([music.js](music.js))

Onsets within 35 ms are one event, weighed by metre (downbeat, beat, half beat, from the file's
time signatures), a new note on top (the melody), loudness, chord size and the time to the next
onset. Dynamic programming picks the best set at least *Min gap* apart for the *Landings* rate
asked (the cost of a landing is found by bisection), with long silences between landings
discouraged. A run-up of 1.75 s goes before the music. Each landing also gets the melody's height
around it (semitones from the piece's middle) and the energy of the music around it.

## Planning ([planner.js](planner.js))

A beam search over landings (4 runs kept). From Bosh on the pad he just landed on, it tries:

- **kickers**: the pad continues straight, then curves up (radius from his speed, 2–6 × gravity) to an
  exit angle, then a straight exit so he leaves without spinning; flights around the natural flight
  time `2 v sin(-φ) / g` of that angle
- **drops**: the pad continues, and he rolls off the end and falls onto the next

Each candidate is simulated frame by frame up to the next note. On the note's frame, a pad goes
where he is about to be: across his lowest point, halfway between where it is on the frame before
and where it would be on the frame, at an angle 9–22° under his direction (harder for stronger
notes), or flat under the sled. Then that is simulated too. It must be touched first on exactly
that frame, and he must survive 5 frames on a run-out. Pads can be red (accelerating or braking,
drawn backwards and flipped) to bring him to the speed the music asks for. A candidate is thrown
out if he crashes, stalls, touches an old line, or if a new line would have pushed him anywhere he
has already been. The cost mixes: time in the air against the gap, landing height against the
melody's contour (*Pitch → height*), speed against the music's energy (*Speed*), binding stress,
the sled's angle against the pad's, landing angle and steepness.

At the end the whole track is ridden again from the start ([`verifyPlan`](planner.js)), and the
page rides the saved track data once more to show its check.

Results (Landings 1.8/s, Min gap 0.25 s, Node, M-series Mac):

| Piece | Ride | Landings | On their frame | Lines | Planned in |
|---|---|---|---|---|---|
| Beethoven – Für Elise | 2:50 | 291 | 291 | 1,488 | 2.1 s |
| Mozart – Rondo alla Turca | 3:14 | 331 | 331 | 1,440 | 2.4 s |
| Chopin – Minute Waltz | 1:36 | 165 | 165 | 639 | 1.1 s |
| Rush E | 2:22 | 247 | 247 | 962 | 2.0 s |
| Debussy – Clair de lune | 4:10 | 440 | 440 | 2,018 | 3.8 s |
| Beethoven – Symphony No. 5, I | 6:36 | 704 | 704 | 2,665 | 5.9 s |
| Bach – Toccata and Fugue in D minor | 8:28 | 876 | 876 | 3,523 | 7.9 s |

None crashes. With a 0.2 s minimum gap, Clair de lune skips 3 of 440 notes (8 frames apart).

What physics allows: at 40 fps and 0.175 px/frame², a hop of t seconds rises at most about
35 t² px if it lands where it took off (a 0.4 s gap: about 5 px; Bosh is 17 px long). So in fast
passages he skims over stepped pads, and only gaps of a second or more give real jumps (apexes of
3–18 px on average depending on the piece, about 40–50 px on 2–3 s gaps). Rising melodies need kickers and cost speed,
falling ones are free.

## Drawing ([render.js](render.js))

Lines black on paper (or light on night), each pad in its note's pitch-class colour, glowing for
0.3 s when he lands on it, red lines with a rail and chevrons the way they push, Bosh with his sled,
hat and striped scarf, his trail over the last 2 s, a camera decided in advance (his centre 0.35 s
ahead, eased both ways so it neither lags nor overshoots), and a strip of the landings along the
bottom.

## Page

Song or MIDI file (or a `.track.json`, to watch any track ride), *Landings*, *Min gap*,
*Pitch → height*, *Speed*, *Take* (seed) and *Beam*, then Generate (in a worker, about 1 s a minute
of music). Save .track.json for linerider.com / LRA: the music starts at the run-up time given in
the track's description. Settings in the address bar.

## Tests

- `node --test bosh/test/bosh.test.js` (6): every frame of three tracks against lr-core's hashes in
  [test/fixture.json](test/fixture.json) (a crash, red and flipped lines, a planned track), lines and
  grid, `.track.json` round trip, landing choice, every planned landing on its frame, gaps of
  0.25–3 s
- `node bosh/test/oracle.mjs --lrcore <node_modules/lr-core> <track.json> …` against lr-core itself
  (`npm install --ignore-scripts lr-core@0.8.2` outside the repo); `make_fixture.mjs` remakes the fixture
- `node bosh/test/browser.mjs song=midis/elise.mid` runs the page in Chromium and saves screenshots;
  `node bosh/test/sheet.mjs <track.json> <pads.json> <out.png>` draws a contact sheet of landings
  (both need playwright-core: `PLAYWRIGHT=…/playwright-core/index.mjs`)

Not yet: video export, scenery, loops and the other set pieces of hand-made tracks, and checking a
saved track in linerider.com itself (it runs lr-core's physics; the test above is against lr-core).
