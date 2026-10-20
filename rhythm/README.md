# Experiment #040 – Rhythm

[040_rhythm.html](../040_rhythm.html) listens to the microphone and shows the beat, the tempo, the meter, the downbeat, swing and a step grid of the rhythm as the music plays. Everything runs in an AudioWorklet, in the browser.

## Files

| File | What it does |
|---|---|
| [onset.js](onset.js) | Onset front end at 100 frames / s: Hann 2048 FFT, a log-spaced filterbank (24 bands per octave, 30 Hz – 16 kHz), log compression and SuperFlux (Böck & Widmer 2013). Also the flux in three bands (low < 200 Hz, mid, high > 4 kHz), a chroma and the frame level |
| [tempo.js](tempo.js) | Tempogram: autocorrelation of the last 8 s of onset strength through a comb (the lag and its multiples 2–4, half the lag a little), weighted toward 120 BPM. Fed to the tracker as a tempo prior and drawn on the page |
| [beat.js](beat.js) | Beat tracker: the bar-pointer state space of Krebs, Böck & Widmer (2015) as in madmom's DBN tracker (one chain of positions per beat interval, tempo changes only on beats), run as a causal forward filter. Each frame the posterior gives the frames until the next beat; a beat is emitted when it is due |
| [level.js](level.js) | Beat level. The tracker locks onto the fastest regular pulse, often the eighth note. When every other pulse carries more onset, low and mid energy (and the low band by at least 2.5×), and the pulse is above 105 BPM, every other pulse is reported |
| [meter.js](meter.js) | From the beats: beats per bar (lag-3 vs lag-2/4 repetition of beat summaries), downbeat (low band, onsets, less hi-hat, and harmonic change in the chroma), subdivision (duple or triple from a histogram of the onsets across the beat), swing ratio, and a 3-band step grid of the last bars |
| [analyzer.js](analyzer.js) | The pipeline, silence handling (beats stop after 1.5 s below −60 dBFS, the tracker starts over after 3 s), tap tempo and the beat-level override |
| [rhythm-worklet.js](rhythm-worklet.js) | Runs the analyser in the audio thread and posts frames, beats, the tempogram and the load |
| [demo.js](demo.js) | Synthesised drum loops for the page's Demo source (rock, house, funk, shuffle, waltz, 6/8, bossa) |
| [research/01_beat_tracking.md](research/01_beat_tracking.md) | Research brief: onset detection, tempo, beat tracking, meter and downbeats, real-time systems and what the page uses |

## The page

- **Sources:** microphone (echo cancellation, noise suppression and auto gain off, device picker), a demo loop at any tempo, or an audio file.
- **Readout:** tempo to 0.1 BPM, time signature, straight / swing ratio / triplet feel, a lamp per beat with the downbeat larger, and a confidence bar (how much stronger the onsets are on the beats than between them).
- **Timeline:** the last 6 s of onset strength and the three bands, the detected beats (downbeats in orange), the predicted beats ahead of now (dashed), and for the demo the true beats (green ticks).
- **Tempo panel:** the comb tempogram and the tracker's tempo belief.
- **Rhythm grid:** low / mid / high energy on each 16th (or triplet 8th) of the bar, averaged over the last 4 bars, with a playhead.
- **Controls:** tempo range, beat level (Auto / Pulse / Half), tap tempo (T), reset (R), a metronome that clicks on the detected beat (M) with an offset slider. The lamps and clicks are scheduled from the predicted next beat, not from the beat event, so they land on the beat. With the microphone, the click is moved earlier by the input and output latency the browser reports.
- Settings stay in the address bar (`?source=demo&style=shuffle&bpm=100`).

## Accuracy

`node rhythm/test/eval.js` scores the analyser as it runs live (128-sample blocks, beats as emitted) on 34 songs: 18 synthesised styles (rock, house, funk, hip-hop, shuffle, jazz swing, waltz, 6/8, reggae, drum & bass, bossa, metal, ballad, piano only, a tempo ramp, a tempo jump, 150 BPM four-on-the-floor, a slow waltz) and 16 repo MIDIs (game music, ragtime, tango, Mozart), rendered with OxiSynth and the Creative GM soundfont, clean and through a laptop-microphone model (room reverb, band limit, pink noise at 30 dB SNR, level drift). Metrics follow mir_eval: F-measure within ±70 ms, CMLt (right tempo and phase), AMLt (also at double / half tempo or off-beat), tempo Acc1 (±4 %) and Acc2 (also ×2, ×3, ×½, ×⅓).

| | F | CMLt | AMLt | Acc1 | Acc2 | meter | lock |
|---|---|---|---|---|---|---|---|
| Clean | 88.0 | 72.0 | 89.0 | 76.1 | 98.6 | 33/34 | 3.3 s |
| Microphone model | 88.3 | 73.9 | 87.9 | 78.3 | 98.1 | 33/34 | 3.6 s |

- Lock is the time to four correct beats in a row: 0.4–1.4 s on most drum styles, 6 s on the ballad, longer on sparse piano music.
- Most of the gap between AMLt and CMLt is the metrical level. Funk at 96, reggae at 76, the Entertainer at 70 and River Flows in You at 72 are tracked at double tempo, every beat on an eighth note. A listener could tap either. Tap tempo, or Beat level: Half, fixes them.
- Downbeats: F 73 (clean) and 78 (microphone) on the 23 songs tracked at the right level. They are best with a chord change or a kick on the bar line, and weakest on piano music and on songs whose harmony moves every beat.
- Meter is 3 vs 4 beats per bar. 2/4 and 4/4 are not told apart, and 6/8 shows as 12/8 (two dotted beats per bar, reported in fours).
- Known failures: Gerudo Valley is tracked at the right tempo but on the off-beat (F 16), Skyrim's 6/8 locks at 3:2, and the Mozart sonata movements with heavy rubato drift.
- Beats are emitted on time: their timestamps are the predicted beats, and the event reaches the page −4 to −6 ms before the beat it reports (lag measured in Node and in Chromium). The onset window adds 21 ms of analysis delay, which the prediction covers.
- The analysis costs 1.3 % of one core at 44.1 kHz (75× real time in Node), 1.5–3 % in the worklet.

Demo loops (`demo.js`, 7 styles × 64–184 BPM): 90 of 112 have beat F above 90, and 99 have AMLt above 80. Most of the misses are house, funk and bossa below 100 BPM, which are tracked at twice the tempo. Tap tempo fixes them.

## Tests

- `node --test rhythm/test/rhythm.test.js` runs 10 tests: the FFT, onset timing, click tracks from 60 to 190 BPM (tempo within 1 %, locked within 4 s), on-time emission, a tempo ramp and a jump, demo loops (beats, meter, swing), downbeats, silence and reset, tap tempo, and speed.
- `node rhythm/test/eval.js [--clean|--mic] [--only=rock,…] [--set=synth|midi] [key=value …]` runs the corpus evaluation. key=value overrides any analyser option. Renders are cached in `/tmp/rhythm-corpus`.
- `node rhythm/test/browser.mjs [song=rock]` opens the page in Chromium on the demo loop and on Chromium's fake microphone fed with a corpus song through the microphone model. It needs the parent folder served on :8000 and playwright-core (see the file). Last run: demo shuffle at 100 BPM F 100 (swing 1.97 : 1), fake microphone rock F 100 at 120.0 BPM.
