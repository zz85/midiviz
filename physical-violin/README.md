# Bowed Violin

Experiment #048 is a monophonic physical bowed-string instrument that runs in
Web Audio. Keyboard, pointer and Web MIDI input control it live. The same model
plays violin, viola, cello and double bass (Instrument menu).

The signal path is:

1. A hysteretic Coulomb/Friedlander stick-slip junction excites a two-part
   fractional-delay waveguide. Static and dynamic friction, bow force and
   string impedance determine when the string grips or slips.
2. Loss filters, changing delay length and slow performance variation shape
   each string.
3. Tuned feedback delays add sympathetic open-string resonance.
4. A short body impulse response or synthetic modal body filters the raw
   string.
5. A generated stereo room response adds early reflections and decay.

The XY pad maps vertical movement to expression (bow speed and dynamics) and
horizontal movement to vibrato depth. It also follows MIDI CC11/CC2 and CC1.
Presets cover balanced legato, sul tasto, sul ponticello, baroque, flautando
and the unfiltered string.

## The family

One model, per-instrument settings (`INSTRUMENTS` in `violin-core.js`):

| | Violin | Viola | Cello | Double bass |
|---|---|---|---|---|
| open strings | G3 D4 A4 E5 | C3 G3 D4 A4 | C2 G2 D3 A3 | E1 A1 D2 G2 (fourths) |
| playable range (MIDI) | 55–101 | 48–96 | 36–89 | 28–80 |
| keyboard starts at | G3 | C3 | C2 | E1 |
| pressure scale | 0.22 | 0.22 | 0.5 | 0.38 |
| bow-speed / pressure wander | ±15% / ±12% | ±7% / ±5.5% | ±7% / ±5.5%, growing 1.2×/octave above 175 Hz | ±5% / ±4%, growing 1.2×/octave above 110 Hz |
| default body | Iowa violin (detailed) | Iowa viola (smooth) | Iowa cello (smooth) | Iowa double bass (smooth) |
| output gain | 0.25 | 0.25 | 0.115 | 0.10 |

- **Pressure scale.** Schelleng's minimum bow force rises with string
  impedance, so the heavier strings need more pressure than the violin to stay
  in Helmholtz motion. The values were set by sweeping every fourth note of
  each range at bow pressure 0.25/0.5/0.75 and expression 0.2/0.5/0.85.
- **Texture, noise and loss** come from fits to each instrument's University of
  Iowa recordings: less wander than the violin (the recordings are steadier),
  less per-cycle jitter on the cello and bass, a little less friction noise on
  the bass. The cello's string loss tracks pitch with slope 0.7: the Iowa fit
  preferred 0.4, but 0.4 left the low strings stuck in multiple slipping.
- **Bodies.** Fitted from the Iowa recordings of each instrument and stored
  in `irs/`. The fitted main air resonance is about 285 Hz (violin), 240
  (viola), 111 (cello) and 64 Hz (double bass). Presets name violin bodies and
  are mapped to the current instrument's equivalent. Any WAV impulse response
  can replace the body.
- **Known gap.** After the body fit, the real top string of the viola, cello and
  bass is 6–11 dB weaker in its fundamental region than the model's. All four
  strings share one string model.

## Attacks

A detached note now reaches Helmholtz motion (one stick and one slip per
period) within about 15–40 ms on the violin's upper strings, against 100–140 ms
before. Three changes did it:

- **Pressure first.** At the start of a detached note the bow pressure builds
  in 4 ms (`pressureOnset`), then follows the usual ramps. It used to creep up
  over 0.1–0.25 s, so every attack began below Schelleng's minimum force and
  played three, then two slips per period before settling.
- **The bow reaches speed in 60 ms** (`bowOnset`). It used to accelerate at a
  fixed rate, taking 70–260 ms depending on expression.
- **Bow-hair compliance.** The bow contact sees 90% of the string's velocity
  (`bowCoupling`). The hair's give and the bow's width soften the contact,
  which damps the secondary slips that otherwise trap an attack in multiple
  slipping for many periods.

Legato notes keep the bow moving and are unaffected; releases use the usual
ramps. The violin's steady tone is unchanged (harmonics 2–8 within 1–2 dB,
spectral centroid within 1%).

Measured at the default bowing with noise off (`attackMs` in `test/offline.mjs`):

| Note | Before | After |
|---|---:|---:|
| violin G3 / A4 / E5 / E6 | 417 / 140 / 134 / 100 ms | 167 / 34 / 40 / 16 ms |
| viola C3 / D4 / E5 | | 334 / 62 / 40 ms |
| cello C2 / G2 / D3 / A3 | | 146 / 78 / 55 / 46 ms |
| bass E1 / A1 / D2 / G2 | | 333 / 329 / 199 / 115 ms |

With the "Solo legato" preset (vibrato, bow noise and wander on), the violin's G3
had irregular periods 13% of the time after the attack; it is now 0.3%, and every
instrument is at or below 0.3%.

**Still slow:** the viola's C string and the double bass's E and A strings take
200–330 ms (the bass's are 8–14 periods). Very heavy pressure on a slow bow
(pressure 0.75, expression 0.2) crunches on the lowest strings, as Schelleng's
upper force limit predicts, and the violin's top register (C7) at a very slow bow
slips irregularly, as it did before.

## Files

- `violin-core.js` — bow, waveguide strings, filters, resonators and the
  per-instrument settings.
- `worklet.js` — real-time `AudioWorkletProcessor`; switches instrument on a
  message and keeps the current controls.
- `app.js` — controls, MIDI, body/room graph and oscilloscope.
- `irs/` — fitted violin, viola, cello and double-bass body responses.
- `test/offline.mjs` — offline note renderer, attack timer and diagnostics.

Run the diagnostic with:

```sh
node physical-violin/test/offline.mjs
```

and the tests with:

```sh
node --test physical-violin/test/*.test.mjs
```
