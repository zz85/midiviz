// Sorairo sound: everything is synthesised with Web Audio, no samples.
//   ambience: wind with gusts, leaf rustle, songbirds by day, a distant airliner under the
//             contrail, higurashi cicadas at dusk, crickets at night
//   music:    a slow generative piano over a soft pad, on the "royal road" progression
//             (IVmaj7 - V - iii7 - vi) that anime soundtracks lean on, in D major
// makeAudio(ctx) builds the graph on any BaseAudioContext, so the smoke test can render it
// offline. Call update() each frame with the scene state, schedule(until) to queue notes.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// [bass, pad voicing] in MIDI. IVmaj7 V iii7 vi7 | ii7 V7 Imaj7 Iadd9
const CHORDS = [
  [43, [55, 59, 62, 66]], [45, [57, 61, 64, 69]], [42, [54, 57, 61, 64]], [47, [54, 57, 59, 62]],
  [40, [52, 55, 59, 62]], [45, [55, 57, 61, 64]], [38, [54, 57, 61, 62]], [38, [54, 57, 62, 64]],
];
// melody notes: D major pentatonic, A4 to D6
const SCALE = [69, 71, 74, 76, 78, 81, 83, 86];

export function makeAudio(ctx, seed = 11) {
  const rnd = mulberry32(seed);
  const now = () => ctx.currentTime;
  const SR = ctx.sampleRate;

  // ---------- buses: music and ambience -> master -> gentle limiter
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10; limiter.ratio.value = 6; limiter.attack.value = 0.01; limiter.release.value = 0.3;
  limiter.connect(ctx.destination);
  const master = ctx.createGain(); master.gain.value = 0; master.connect(limiter);
  const musicBus = ctx.createGain(); musicBus.gain.value = 0.6; musicBus.connect(master);
  const ambBus = ctx.createGain(); ambBus.gain.value = 0.8; ambBus.connect(master);

  // a long soft hall: noise with an exponential tail, decorrelated per channel
  const ir = ctx.createBuffer(2, SR * 3.5, SR);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 3.2) * (i < SR * 0.02 ? i / (SR * 0.02) : 1);
  }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const verbIn = ctx.createGain(); verbIn.gain.value = 0.5;
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.55;
  verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);

  // ---------- shared noise: 4 s of pink-ish noise, looped
  const noiseBuf = ctx.createBuffer(1, SR * 4, SR);
  { const d = noiseBuf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) { const w = rnd() * 2 - 1; b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.9; } }
  const noise = (rate = 1) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate; s.start(0, rnd() * 3); return s; };

  // wind: two bands, a low body and an airy whistle that rises with gusts
  const windLow = ctx.createBiquadFilter(); windLow.type = 'lowpass'; windLow.frequency.value = 500;
  const windHigh = ctx.createBiquadFilter(); windHigh.type = 'bandpass'; windHigh.frequency.value = 900; windHigh.Q.value = 1.6;
  const windLowG = ctx.createGain(); windLowG.gain.value = 0;
  const windHighG = ctx.createGain(); windHighG.gain.value = 0;
  noise(0.6).connect(windLow); windLow.connect(windLowG); windLowG.connect(ambBus);
  noise(1).connect(windHigh); windHigh.connect(windHighG); windHighG.connect(ambBus);
  // leaves and grass: hiss above 3 kHz, only in gusts
  const rustle = ctx.createBiquadFilter(); rustle.type = 'highpass'; rustle.frequency.value = 3200;
  const rustleG = ctx.createGain(); rustleG.gain.value = 0;
  const rustlePan = ctx.createStereoPanner(); rustlePan.pan.value = -0.25;
  noise(1.3).connect(rustle); rustle.connect(rustleG); rustleG.connect(rustlePan); rustlePan.connect(ambBus);
  // rain: a broad hiss of drops on grass, a duller patter close by, and drips off the tree
  const rainHi = ctx.createBiquadFilter(); rainHi.type = 'bandpass'; rainHi.frequency.value = 5200; rainHi.Q.value = 0.45;
  const rainLo = ctx.createBiquadFilter(); rainLo.type = 'bandpass'; rainLo.frequency.value = 1300; rainLo.Q.value = 0.7;
  const rainHiG = ctx.createGain(); rainHiG.gain.value = 0;
  const rainLoG = ctx.createGain(); rainLoG.gain.value = 0;
  noise(1.1).connect(rainHi); rainHi.connect(rainHiG); rainHiG.connect(ambBus); rainHiG.connect(verbIn);
  noise(0.8).connect(rainLo); rainLo.connect(rainLoG); rainLoG.connect(ambBus);
  function drip(t) {
    const o = ctx.createOscillator(), g = ctx.createGain(), pan = ctx.createStereoPanner();
    const f = 1400 + rnd() * 2200;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.04);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 + rnd() * 0.05, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.06);
    pan.pan.value = rnd() * 1.4 - 0.7;
    o.connect(g); g.connect(pan); pan.connect(ambBus); pan.connect(verbIn);
    o.start(t); o.stop(t + 0.08);
  }
  // airliner: a far rumble that comes and goes with the contrail
  const jet = ctx.createBiquadFilter(); jet.type = 'lowpass'; jet.frequency.value = 160;
  const jetG = ctx.createGain(); jetG.gain.value = 0;
  noise(0.35).connect(jet); jet.connect(jetG); jetG.connect(ambBus); jetG.connect(verbIn);

  // ---------- insects: sampled once, looped
  // crickets: 4.6 kHz chirps in groups of three, two slightly different callers
  function cricketBuf(f, rate) {
    const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / SR, ph = (t * rate) % 1; // one chirp group per 1/rate s
      const pulse = ph < 0.18 ? Math.pow(Math.sin(Math.PI * ((ph * 3 / 0.18) % 1)), 2) : 0;
      d[i] = Math.sin(2 * Math.PI * f * t) * pulse * 0.5;
    }
    return b;
  }
  const crickets = ctx.createGain(); crickets.gain.value = 0; crickets.connect(ambBus); crickets.connect(verbIn);
  [[4600, 1.0, -0.6], [4380, 1.25, 0.55], [4820, 0.5, 0.1]].forEach(([f, r, p]) => {
    const s = ctx.createBufferSource(); s.buffer = cricketBuf(f, r); s.loop = true; s.loopEnd = 2; s.start(0, rnd() * 2);
    const pan = ctx.createStereoPanner(); pan.pan.value = p; const g = ctx.createGain(); g.gain.value = 0.25;
    s.connect(g); g.connect(pan); pan.connect(crickets);
  });
  // higurashi: the falling "kana-kana-kana" call of the evening cicada, about 6 s
  const higuBuf = ctx.createBuffer(1, SR * 6, SR);
  { const d = higuBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / SR, u = t / 6;
      const f = 5200 - 900 * u;                       // the whole call sinks
      const syl = (t * (7.5 - 2.5 * u)) % 1;          // syllables slow down
      const am = Math.pow(Math.sin(Math.PI * Math.min(1, syl / 0.7)), 1.5) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 95 * t));
      const env = Math.min(1, t / 0.4) * Math.pow(1 - u, 1.4);
      d[i] = Math.sin(2 * Math.PI * f * t + 0.6 * Math.sin(2 * Math.PI * 2 * f * t)) * am * env * 0.35;
    } }
  const higu = ctx.createGain(); higu.gain.value = 0; higu.connect(ambBus); higu.connect(verbIn);

  // ---------- scene state (smoothed toward targets in update)
  // birdsK and insects scale the wildlife by season (1 = summer)
  const st = { day: 1, dusk: 0, night: 0, wind: 1.2, trail: 0, flock: 0, music: 0.6, amb: 0.8, birdsK: 1, insects: 1, rain: 0, on: false };
  const ramp = (p, v, tc = 0.4) => p.setTargetAtTime(v, now(), tc);

  // ---------- one-shot voices
  function bird(t) {
    // a songbird phrase: 2-6 quick whistles, each a pitch sweep
    const pan = ctx.createStereoPanner(); pan.pan.value = rnd() * 1.6 - 0.8;
    const g = ctx.createGain(); g.gain.value = 0.05 + rnd() * 0.05;
    pan.connect(g); g.connect(ambBus); g.connect(verbIn);
    const base = 2600 + rnd() * 1800, n = 2 + Math.floor(rnd() * 5), kind = rnd();
    for (let k = 0; k < n; k++) {
      const t0 = t + k * (0.09 + rnd() * 0.08), d = 0.05 + rnd() * 0.08;
      const o = ctx.createOscillator(), e = ctx.createGain();
      const f0 = base * (1 + (rnd() - 0.5) * 0.25);
      o.frequency.setValueAtTime(f0 * (kind < 0.5 ? 0.8 : 1.3), t0);
      o.frequency.exponentialRampToValueAtTime(f0 * (kind < 0.5 ? 1.35 : 0.75), t0 + d);
      e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(1, t0 + 0.01); e.gain.exponentialRampToValueAtTime(0.001, t0 + d);
      o.connect(e); e.connect(pan); o.start(t0); o.stop(t0 + d + 0.02);
    }
  }
  function piano(m, t, vel, len = 3.2) {
    // soft felt piano: sine fundamental, a little 2nd and 3rd partial, fast decay of the
    // bright part and a slow one of the body, through a lowpass that closes as it dies
    const f = mtof(m), out = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400 + vel * 2500, t); lp.frequency.exponentialRampToValueAtTime(700, t + len);
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vel * 0.16, t + 0.006);
    out.gain.exponentialRampToValueAtTime(vel * 0.05, t + 0.5); out.gain.exponentialRampToValueAtTime(0.0005, t + len);
    [[1, 1], [2, 0.32], [3, 0.1], [4.01, 0.04]].forEach(([h, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f * h; o.detune.value = (rnd() - 0.5) * 4; g.gain.value = a;
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + len + 0.05);
    });
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.max(-0.6, Math.min(0.6, (m - 66) / 30));
    lp.connect(out); out.connect(pan); pan.connect(musicBus); pan.connect(verbIn);
  }
  function pad(notes, bass, t, len, dark) {
    // warm string pad: detuned saws through a slow-opening lowpass
    const lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(dark ? 650 : 1100, t + len * 0.5); lp.frequency.linearRampToValueAtTime(400, t + len + 1.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + len * 0.35); g.gain.setValueAtTime(0.035, t + len * 0.8); g.gain.linearRampToValueAtTime(0, t + len + 1.5);
    [...notes, bass + 12, bass].forEach((m, i) => [-7, 7].forEach((det) => {
      const o = ctx.createOscillator(); o.type = i >= notes.length ? 'triangle' : 'sawtooth';
      o.frequency.value = mtof(m); o.detune.value = det + (rnd() - 0.5) * 3;
      o.connect(lp); o.start(t); o.stop(t + len + 1.6);
    }));
    lp.connect(g); g.connect(musicBus); g.connect(verbIn);
  }

  // ---------- scheduler: one chord per bar at 64 bpm, melody on an eighth-note grid
  const BEAT = 60 / 64, BAR = BEAT * 4;
  let nextBar = 0, bar = 0, mel = 3, nextBird = 0, nextHigu = 0, nextDrip = 0;
  function schedule(until) {
    if (!nextBar) { nextBar = now() + 0.3; nextBird = now() + 1; nextHigu = now() + 3; nextDrip = now() + 0.5; }
    while (nextBar < until) {
      const t = nextBar, [bass, notes] = CHORDS[bar % CHORDS.length], quiet = st.night > 0.5;
      pad(notes, bass, t, BAR, quiet);
      piano(bass, t, 0.55, BAR * 1.1); // bass note on the downbeat
      // melody: a random walk on the pentatonic, resting more at night and between phrases
      const density = (quiet ? 0.28 : 0.5) * (bar % 4 === 3 ? 0.55 : 1);
      for (let e = 0; e < 8; e++) {
        if (rnd() > density * (e % 2 ? 0.6 : 1)) continue;
        mel = Math.max(0, Math.min(SCALE.length - 1, mel + Math.round((rnd() - 0.5) * 3.2)));
        let m = SCALE[mel];
        // land on chord tones on the beat
        if (e % 2 === 0 && !notes.some((n) => (n - m) % 12 === 0)) m = SCALE[Math.max(0, mel - 1)];
        piano(m - (quiet ? 12 : 0), t + e * BEAT / 2 + (rnd() - 0.5) * 0.02, 0.35 + rnd() * 0.35);
      }
      // a high chord-tone bell to close every 4 bars
      if (bar % 4 === 3) piano(notes[notes.length - 1] + 24, t + BAR - BEAT, 0.25, 5);
      nextBar += BAR; bar++;
    }
    while (nextBird < until) {
      if (st.on && st.day > 0.4 && rnd() < st.day * st.birdsK) bird(nextBird);
      // a flock overhead brings a burst of calls
      nextBird += st.flock > 0.5 ? 0.4 + rnd() * 0.6 : 2.5 + rnd() * 6;
    }
    while (nextDrip < until) {
      if (st.on && st.rain > 0.05) drip(nextDrip);
      nextDrip += st.rain > 0.05 ? (0.04 + rnd() * 0.5) / st.rain : 0.5;
    }
    while (nextHigu < until) {
      if (st.dusk > 0.3 && rnd() < st.insects) {
        const s = ctx.createBufferSource(), p = ctx.createStereoPanner();
        s.buffer = higuBuf; s.playbackRate.value = 0.95 + rnd() * 0.1; p.pan.value = rnd() * 1.4 - 0.7;
        s.connect(p); p.connect(higu); s.start(nextHigu);
      }
      nextHigu += 7 + rnd() * 9;
    }
  }

  // ---------- per-frame scene state
  let gust = 0;
  function update(s, time) {
    Object.assign(st, s);
    // gusts: a few incommensurate slow sines, squashed so most of the time it's calm
    const g = 0.5 + 0.22 * Math.sin(time * 0.13) + 0.18 * Math.sin(time * 0.31 + 1.7) + 0.1 * Math.sin(time * 0.71 + 4.2);
    gust = Math.pow(Math.max(0, Math.min(1, g)), 2);
    const w = Math.min(1.6, st.wind / 1.2);
    ramp(windLowG.gain, w * (0.16 + 0.22 * gust));
    ramp(windHighG.gain, w * (0.03 + 0.12 * gust));
    ramp(windHigh.frequency, 600 + 900 * gust * w);
    ramp(rustleG.gain, w * 0.09 * gust * gust * (s.leaves ?? 1));
    ramp(jetG.gain, 0.55 * st.trail * st.day);
    ramp(rainHiG.gain, 0.5 * st.rain * (0.85 + 0.15 * gust));
    ramp(rainLoG.gain, 0.22 * st.rain);
    ramp(crickets.gain, 0.5 * st.night * st.insects);
    ramp(higu.gain, Math.min(1, st.dusk * 1.4) * st.insects, 1);
    ramp(musicBus.gain, st.music * (st.night > 0.5 ? 0.75 : 1), 0.8);
    ramp(ambBus.gain, st.amb);
  }

  // ---------- on/off with a fade
  function setOn(on) {
    st.on = on;
    master.gain.cancelScheduledValues(now());
    master.gain.setTargetAtTime(on ? 0.9 : 0, now(), on ? 1.2 : 0.3);
  }
  return { update, schedule, setOn, state: st, get gust() { return gust; } };
}

// Live wrapper: creates the context on first user gesture, runs the scheduler.
export function makeLiveAudio() {
  let ctx = null, audio = null, timer = 0, pending = null;
  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    audio = makeAudio(ctx);
    if (pending) audio.update(pending, 0);
    timer = setInterval(() => audio.schedule(ctx.currentTime + 1.2), 250);
  }
  return {
    setOn(on) {
      if (on) { ensure(); ctx.resume(); audio.setOn(true); audio.schedule(ctx.currentTime + 1.2); }
      else if (audio) { audio.setOn(false); setTimeout(() => { if (!audio.state.on) ctx.suspend(); }, 1500); }
    },
    update(s, time) { if (audio && audio.state.on) audio.update(s, time); else pending = s; },
    get on() { return !!audio?.state.on; },
    dispose() { clearInterval(timer); ctx?.close(); },
  };
}
