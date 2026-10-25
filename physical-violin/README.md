# Bowed Violin

Experiment #048 is a monophonic physical bowed-string instrument that runs in
Web Audio. Keyboard, pointer and Web MIDI input control it live.

The signal path is:

1. A hysteretic Coulomb/Friedlander stick-slip junction excites a two-part
   fractional-delay waveguide. Static and dynamic friction, bow force and
   string impedance determine when the string grips or slips.
2. Loss filters, changing delay length and slow performance variation shape
   each string.
3. Tuned feedback delays add sympathetic open-string resonance.
4. A short violin-body impulse response or synthetic modal body filters the
   raw string.
5. A generated stereo room response adds early reflections and decay.

The XY pad maps vertical movement to expression (bow speed and dynamics) and
horizontal movement to vibrato depth. It also follows MIDI CC11/CC2 and CC1.
Presets cover balanced legato, sul tasto, sul ponticello, baroque, flautando
and the unfiltered string.

The included detailed and smooth body responses were fitted from the
University of Iowa Musical Instrument Samples violin recordings. A user can
replace them with any WAV impulse response.

## Files

- `violin-core.js` — bow, waveguide strings, filters and resonators.
- `worklet.js` — real-time `AudioWorkletProcessor`.
- `app.js` — controls, MIDI, body/room graph and oscilloscope.
- `irs/` — the two included violin-body responses.
- `test/offline.mjs` — offline note renderer and diagnostics.

Run the diagnostic with:

```sh
node physical-violin/test/offline.mjs
```
