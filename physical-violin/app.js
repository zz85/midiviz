// UI + audio graph: model (worklet) → body convolution → clip → dry + FDN room → out.

const PARAMS = [
  // id, label, min, max, step, default, note
  ['expression', 'Expression', 0, 1, 0.01, 0.6, 'bow speed · CC11'],
  ['bowForce', 'Bow pressure', 0, 1, 0.01, 0.5, ''],
  ['bowPosition', 'Bow position', 0, 0.4, 0.005, 0.1, 'bridge ← → fingerboard'],
  ['stickiness', 'Rosin grip', 0, 1, 0.01, 0.5, ''],
  ['bowNoise', 'Bow noise', 0, 1, 0.01, 0.5, ''],
  ['bowRandomPos', 'Contact wander', 0, 1, 0.01, 0.5, ''],
  ['stringRes', 'Sympathetic resonance', 0, 1, 0.01, 0.5, ''],
  ['vibratoDepth', 'Vibrato depth', 0, 1, 0.01, 0.3, 'CC1'],
  ['vibratoRate', 'Vibrato rate', 3, 8, 0.1, 5.8, 'Hz'],
  ['portamentoTime', 'Portamento', 0, 0.4, 0.005, 0.06, 'seconds'],
  ['forceScale', 'Pressure scale', 0.02, 0.5, 0.005, 0.22, 'normal-force calibration'],
];

// Synthetic body IRs: sums of damped modes typical of violin bodies (A0, B1−, B1+, bridge hill).
// A measured or fitted response can also be loaded from a WAV file.
const BODIES = {
  'Iowa violin, fitted (detailed)': 'irs/violin-body-iowa.wav',
  'Iowa violin, fitted (smooth)': 'irs/violin-body-iowa-smooth.wav',
  'Synthetic: classic': [[275, 45, 1.0], [440, 35, 0.6], [470, 30, 0.9], [540, 30, 1.0], [700, 25, 0.5],
    [1000, 18, 0.45], [1400, 14, 0.4], [2400, 9, 0.7], [2900, 8, 0.55], [3500, 6, 0.35], [4800, 4, 0.2]],
  'Synthetic: dark': [[260, 50, 1.0], [430, 40, 0.8], [520, 35, 1.0], [650, 30, 0.6], [900, 20, 0.4],
    [1300, 15, 0.3], [2200, 10, 0.35], [3000, 7, 0.2]],
  'Synthetic: bright': [[285, 40, 0.8], [470, 30, 0.8], [560, 28, 0.9], [800, 20, 0.6], [1200, 15, 0.6],
    [2500, 9, 1.0], [3100, 8, 0.8], [4200, 5, 0.5], [6000, 3, 0.3]],
  'Dry (no body)': [],
};

export const DEFAULT_BODY = 'Iowa violin, fitted (detailed)';

// Resolve a body entry (file path or mode list) to an AudioBuffer.
async function loadBody(ac, name) {
  const entry = BODIES[name];
  let buf;
  if (typeof entry === 'string') {
    const res = await fetch(new URL(entry, import.meta.url));
    buf = await ac.decodeAudioData(await res.arrayBuffer());
  } else buf = makeBodyIR(ac, entry);
  return unitEnergy(buf);
}

// Scale an IR to unit energy so every body plays at a comparable loudness.
export function unitEnergy(buf) {
  let e = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) e += v * v;
  const k = 1 / Math.sqrt(e / buf.numberOfChannels || 1);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
  return buf;
}

// Synthetic stereo hall IR: decorrelated noise with frequency-dependent exponential decay and
// sparse early reflections.
function makeHallIR(ac, rt60 = 1.8, predelayMs = 12) {
  const fs = ac.sampleRate, n = Math.floor(fs * Math.min(6, rt60 * 1.2));
  const buf = ac.createBuffer(2, n, fs);
  const pre = Math.floor((predelayMs / 1000) * fs);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / fs;
      const decay = Math.exp((-6.91 * t) / rt60);
      const damp = 0.15 + 0.8 * Math.min(1, t / rt60);      // darker as it decays
      lp = lp + (Math.random() * 2 - 1 - lp) * (1 - damp);
      d[i] = lp * decay;
    }
    for (let r = 0; r < 10; r++) {                          // early reflections
      const at = pre + Math.floor(fs * (0.004 + 0.06 * Math.random()));
      if (at < n) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.6 - r * 0.04);
    }
  }
  return buf;
}

function makeBodyIR(ctx, modes, ms = 80) {
  const n = Math.floor((ctx.sampleRate * ms) / 1000);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (!modes.length) { d[0] = 1; return buf; }
  for (const [f, decayMs, g] of modes) {
    const w = (2 * Math.PI * f) / ctx.sampleRate;
    const tau = (decayMs / 1000) * ctx.sampleRate;
    const phase = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) d[i] += g * Math.exp(-i / tau) * Math.sin(w * i + phase);
  }
  d[0] += 0.5;
  let peak = 0;
  for (const v of d) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < n; i++) d[i] /= peak;
  return buf;
}

// Presets: starting points chosen by ear-proxies (Helmholtz stability, spectral balance).
export const PRESETS = {
  'Solo legato (default)': { body: DEFAULT_BODY, roomMix: 0.22, rt60: 1.8,
    params: { expression: 0.6, bowForce: 0.5, bowPosition: 0.1, stickiness: 0.5, bowNoise: 0.35, bowRandomPos: 0.4,
      stringRes: 0.5, vibratoDepth: 0.35, vibratoRate: 5.6, portamentoTime: 0.06 } },
  'Warm, sul tasto': { body: DEFAULT_BODY, roomMix: 0.25, rt60: 2.0,
    params: { expression: 0.55, bowForce: 0.38, bowPosition: 0.2, stickiness: 0.45, bowNoise: 0.25, bowRandomPos: 0.35,
      stringRes: 0.6, vibratoDepth: 0.45, vibratoRate: 5.2, portamentoTime: 0.08 } },
  'Bright, sul ponticello': { body: DEFAULT_BODY, roomMix: 0.18, rt60: 1.6,
    params: { expression: 0.6, bowForce: 0.62, bowPosition: 0.045, stickiness: 0.55, bowNoise: 0.6, bowRandomPos: 0.5,
      stringRes: 0.4, vibratoDepth: 0.2, vibratoRate: 6.0, portamentoTime: 0.05 } },
  'Baroque, no vibrato': { body: 'Iowa violin, fitted (smooth)', roomMix: 0.32, rt60: 2.4,
    params: { expression: 0.55, bowForce: 0.45, bowPosition: 0.12, stickiness: 0.5, bowNoise: 0.45, bowRandomPos: 0.45,
      stringRes: 0.7, vibratoDepth: 0, vibratoRate: 5.5, portamentoTime: 0.02 } },
  'Flautando (airy)': { body: DEFAULT_BODY, roomMix: 0.28, rt60: 2.2,
    params: { expression: 0.4, bowForce: 0.2, bowPosition: 0.24, stickiness: 0.4, bowNoise: 0.7, bowRandomPos: 0.6,
      stringRes: 0.5, vibratoDepth: 0.25, vibratoRate: 5.4, portamentoTime: 0.06 } },
  'Raw string (analysis)': { body: 'Dry (no body)', roomMix: 0, rt60: 1.0,
    params: { expression: 0.6, bowForce: 0.5, bowPosition: 0.1, stickiness: 0.5, bowNoise: 0.35, bowRandomPos: 0.4,
      stringRes: 0, vibratoDepth: 0, vibratoRate: 5.8, portamentoTime: 0.06 } },
};

async function applyPreset(name) {
  const p = PRESETS[name];
  for (const [id, v] of Object.entries(p.params)) setSlider(id, v);
  document.getElementById('body').value = p.body;
  document.getElementById('roomMix').value = p.roomMix;
  document.getElementById('rt60').value = p.rt60;
  if (ctx) {
    body.buffer = await loadBody(ctx, p.body);
    roomGain.gain.value = p.roomMix;
    room.buffer = makeHallIR(ctx, p.rt60);
  }
}

const KEYMAP = 'awsedftgyhujkolp;\''.split('');   // chromatic from G3 (MIDI 55)
const STRING_NAMES = ['G', 'D', 'A', 'E'];

let ctx, node, body, room, roomGain, dryGain, analyser;
let heldKeys = [];
let lastMidi = 69;
let padBowing = false;

// Set a slider's value and run its normal input handler (updates readout and sends params).
function setSlider(id, value) {
  const el = document.getElementById(id);
  el.value = String(value);
  el.dispatchEvent(new Event('input'));
}

// XY pad: Y → expression (CC11), X → vibratoDepth (CC1).
function buildPad() {
  const cv = document.getElementById('xypad');
  const g = cv.getContext('2d');
  const spring = document.getElementById('padSpring');
  const bowMode = document.getElementById('padBow');
  let dragging = false;
  let springAnim = 0;

  const value = (id) => parseFloat(document.getElementById(id).value);

  const draw = () => {
    const w = cv.width, h = cv.height;
    g.fillStyle = '#15151a'; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, 'rgba(80,140,255,0.05)'); grad.addColorStop(1, 'rgba(80,140,255,0.25)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#333'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      g.beginPath(); g.moveTo((i * w) / 4, 0); g.lineTo((i * w) / 4, h); g.stroke();
      g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke();
    }
    g.fillStyle = '#888'; g.font = '12px system-ui';
    g.fillText('expression (CC11) ↑', 8, 16);
    g.fillText('vibrato depth (CC1) →', w - 140, h - 8);
    const x = value('vibratoDepth') * w;
    const y = (1 - value('expression')) * h;
    g.strokeStyle = 'rgba(255,200,100,0.5)';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    g.fillStyle = dragging ? '#ffcc66' : '#cc9944';
    g.beginPath(); g.arc(x, y, dragging ? 11 : 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ddd';
    g.fillText(`expr ${value('expression').toFixed(2)}  vib ${value('vibratoDepth').toFixed(2)}`, 8, h - 8);
  };

  const setFromEvent = (e) => {
    const r = cv.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const fy = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    setSlider('vibratoDepth', fx.toFixed(3));
    setSlider('expression', fy.toFixed(3));
  };

  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    dragging = true;
    cancelAnimationFrame(springAnim);
    setFromEvent(e);
    if (bowMode.checked && !heldKeys.length) { padBowing = true; noteOn(lastMidi); }
    draw();
  });
  cv.addEventListener('pointermove', (e) => { if (dragging) { setFromEvent(e); draw(); } });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (padBowing) { padBowing = false; if (!heldKeys.length) noteOff(); }
    if (spring.checked) {
      // relax both CCs to 0 over ~150 ms, like a sprung joystick
      // decay in floats: sliders snap to their step, so re-reading them would stall above 0
      let ex = value('expression'), vb = value('vibratoDepth');
      const step = () => {
        ex = ex * 0.8 < 0.01 ? 0 : ex * 0.8;
        vb = vb * 0.8 < 0.01 ? 0 : vb * 0.8;
        setSlider('expression', ex.toFixed(3));
        setSlider('vibratoDepth', vb.toFixed(3));
        draw();
        if (ex > 0 || vb > 0) springAnim = requestAnimationFrame(step);
      };
      springAnim = requestAnimationFrame(step);
    }
    draw();
  };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);

  // keep the dot in sync when sliders or MIDI move the values
  for (const id of ['expression', 'vibratoDepth']) document.getElementById(id).addEventListener('input', draw);
  draw();
}

// Shared graph: model → body convolver → (pre-clip tap) → clip → dry + room → out.
export async function buildGraph(ac, { events, bodyName = DEFAULT_BODY, roomMix = 0.22, rt60 = 1.8, makeup = 0.25 } = {}) {
  await ac.audioWorklet.addModule(new URL('worklet.js', import.meta.url));
  const g = {};
  g.node = new AudioWorkletNode(ac, 'physical-violin', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { events } });
  g.body = new ConvolverNode(ac, { disableNormalization: true });   // option name per spec; 'normalize' is ignored
  g.body.buffer = await loadBody(ac, bodyName);
  g.makeup = new GainNode(ac, { gain: makeup });
  g.clip = new WaveShaperNode(ac, { curve: new Float32Array([-0.9999, 0.9999]) });
  g.room = new ConvolverNode(ac, { buffer: makeHallIR(ac, rt60) });
  g.roomGain = new GainNode(ac, { gain: roomMix });
  g.dryGain = new GainNode(ac, { gain: 0.9 });
  g.out = new GainNode(ac, { gain: 1 });
  g.node.connect(g.body).connect(g.makeup).connect(g.clip);
  g.clip.connect(g.dryGain).connect(g.out);
  g.clip.connect(g.room).connect(g.roomGain).connect(g.out);
  return g;
}

async function start() {
  ctx = new AudioContext({ latencyHint: 'interactive' });
  const g = await buildGraph(ctx, { bodyName: document.getElementById('body').value });
  ({ node, body, room, roomGain, dryGain } = g);
  analyser = new AnalyserNode(ctx, { fftSize: 4096 });
  g.out.connect(ctx.destination);
  g.out.connect(analyser);
  node.port.onmessage = ({ data }) => {
    const ok = Math.abs(data.slipsPerPeriod - 1) < 0.05;
    document.getElementById('stats').textContent = data.noteOn
      ? `string ${STRING_NAMES[data.string]} · f0 ${data.f0.toFixed(1)} Hz · slips/period ${data.slipsPerPeriod.toFixed(2)} ${ok ? '(Helmholtz)' : data.slipsPerPeriod < 0.5 ? '(stuck / choked)' : '(multiple slip)'}`
      : 'bow lifted';
  };
  await applyPreset(document.getElementById('preset').value);
  sendParams();
  draw();
  document.getElementById('start').disabled = true;
}

// Offline render of the same graph for diagnostics: returns metrics + left channel.
export async function renderOffline({ seconds = 4, params = {}, bodyName = DEFAULT_BODY, phrase, roomMix, rt60 } = {}) {
  const fs = 48000;
  const ac = new OfflineAudioContext({ numberOfChannels: 4, length: seconds * fs, sampleRate: fs });
  const defaults = Object.fromEntries(PARAMS.map(([id, , , , , def]) => [id, def]));
  const notes = phrase || [{ t: 0.1, midi: 62, dur: 1.2 }, { t: 1.4, midi: 69, dur: 1.0 }, { t: 2.5, midi: 74, dur: 1.2 }];
  const events = [{ t: 0, type: 'params', params: { ...defaults, ...params } }];
  for (const n of notes) { events.push({ t: n.t, type: 'noteOn', midi: n.midi }, { t: n.t + n.dur, type: 'noteOff' }); }
  const g = await buildGraph(ac, { events, bodyName, roomMix, rt60 });
  const merger = new ChannelMergerNode(ac, { numberOfInputs: 4 });
  const split = new ChannelSplitterNode(ac, { numberOfOutputs: 2 });
  g.out.connect(split);
  split.connect(merger, 0, 0); split.connect(merger, 1, 1);
  g.makeup.connect(merger, 0, 2);        // pre-clip, post-body
  g.node.connect(merger, 0, 3);          // dry model
  merger.connect(ac.destination);
  const buf = await ac.startRendering();
  const ch = [0, 1, 2, 3].map((i) => buf.getChannelData(i));
  const stat = (x) => {
    let peak = 0, sum = 0, over = 0;
    for (const v of x) { const a = Math.abs(v); peak = Math.max(peak, a); sum += v * v; if (a >= 0.999) over++; }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / x.length).toFixed(4), clippedPct: +((100 * over) / x.length).toFixed(3) };
  };
  // spectrum of a 1 s steady segment (A4 note) via naive DFT bands
  const seg = ch[0].subarray(Math.floor(1.6 * fs), Math.floor(1.6 * fs) + 8192);
  const bands = [[0, 300], [300, 600], [600, 1200], [1200, 2500], [2500, 5000], [5000, 10000], [10000, 20000]];
  const energy = bands.map(() => 0);
  let cNum = 0, cDen = 0;
  for (let k = 1; k < 8192 / 2; k += 2) {
    let re = 0, im = 0;
    const w = (2 * Math.PI * k) / 8192;
    for (let i = 0; i < 8192; i++) { const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / 8192); re += seg[i] * hann * Math.cos(w * i); im -= seg[i] * hann * Math.sin(w * i); }
    const p = re * re + im * im, f = (k * fs) / 8192;
    cNum += f * p; cDen += p;
    const b = bands.findIndex(([lo, hi]) => f >= lo && f < hi);
    if (b >= 0) energy[b] += p;
  }
  const tot = energy.reduce((a, b) => a + b, 0) || 1;
  return {
    sampleRate: fs,
    left: Array.from(ch[0]),
    right: Array.from(ch[1]),
    metrics: {
      out: stat(ch[0]), preClip: stat(ch[2]), dryModel: stat(ch[3]),
      centroidHz: Math.round(cNum / (cDen || 1)),
      bandsPct: Object.fromEntries(bands.map(([lo, hi], i) => [`${lo}-${hi}`, +((100 * energy[i]) / tot).toFixed(1)])),
    },
  };
}

function sendParams() {
  if (!node) return;
  const params = {};
  for (const [id] of PARAMS) params[id] = parseFloat(document.getElementById(id).value);
  node.port.postMessage({ type: 'params', params });
}

function noteOn(midi) {
  lastMidi = midi;
  node?.port.postMessage({ type: 'noteOn', midi });
  document.getElementById('note').textContent = `MIDI ${midi}`;
}

function noteOff() {
  node?.port.postMessage({ type: 'noteOff' });
}

function buildUI() {
  const box = document.getElementById('params');
  for (const [id, label, min, max, step, def, note] of PARAMS) {
    const row = document.createElement('label');
    row.innerHTML = `<span>${label} <small>${note}</small></span>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${def}">
      <output id="${id}-v">${def}</output>`;
    box.appendChild(row);
    row.querySelector('input').addEventListener('input', (e) => {
      document.getElementById(`${id}-v`).textContent = e.target.value;
      sendParams();
    });
  }
  const sel = document.getElementById('body');
  for (const name of Object.keys(BODIES)) sel.add(new Option(name, name));
  sel.value = DEFAULT_BODY;
  sel.addEventListener('change', async () => { if (ctx) body.buffer = await loadBody(ctx, sel.value); });
  document.getElementById('ir').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f || !ctx) return;
    body.buffer = unitEnergy(await ctx.decodeAudioData(await f.arrayBuffer()));
  });
  document.getElementById('roomMix').addEventListener('input', (e) => { if (roomGain) roomGain.gain.value = parseFloat(e.target.value); });
  document.getElementById('rt60').addEventListener('change', (e) => { if (room) room.buffer = makeHallIR(ctx, parseFloat(e.target.value)); });
  const ps = document.getElementById('preset');
  for (const name of Object.keys(PRESETS)) ps.add(new Option(name, name));
  ps.addEventListener('change', () => applyPreset(ps.value));
  document.getElementById('start').addEventListener('click', start);

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = KEYMAP.indexOf(e.key.toLowerCase());
    if (k < 0) return;
    const midi = 55 + k + (e.shiftKey ? 12 : 0);
    heldKeys.push(midi);
    noteOn(midi);
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP.indexOf(e.key.toLowerCase());
    if (k < 0) return;
    heldKeys = heldKeys.filter((m) => m !== 55 + k && m !== 67 + k);
    if (heldKeys.length) noteOn(heldKeys[heldKeys.length - 1]);   // legato back to the held note
    else if (!padBowing) noteOff();
  });
  buildPad();

  navigator.requestMIDIAccess?.().then((access) => {
    for (const input of access.inputs.values()) {
      input.onmidimessage = ({ data: [st, d1, d2] }) => {
        const cmd = st & 0xf0;
        if (cmd === 0x90 && d2 > 0) { heldKeys.push(d1); noteOn(d1); }
        else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
          heldKeys = heldKeys.filter((m) => m !== d1);
          if (heldKeys.length) noteOn(heldKeys[heldKeys.length - 1]); else noteOff();
        } else if (cmd === 0xb0 && (d1 === 11 || d1 === 2)) {
          setSlider('expression', (d2 / 127).toFixed(3));      // CC11 expression / CC2 breath
        } else if (cmd === 0xb0 && d1 === 1) {
          setSlider('vibratoDepth', (d2 / 127).toFixed(3));    // CC1 mod wheel → vibrato
        }
      };
    }
  }).catch(() => {});
}

function draw() {
  const cv = document.getElementById('scope');
  const g = cv.getContext('2d');
  const t = new Float32Array(analyser.fftSize);
  const f = new Float32Array(analyser.frequencyBinCount);
  const loop = () => {
    analyser.getFloatTimeDomainData(t);
    analyser.getFloatFrequencyData(f);
    const w = cv.width, h = cv.height;
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6cf'; g.beginPath();
    for (let i = 0; i < 1024; i++) { const x = (i / 1024) * w; const y = h / 4 - t[i] * (h / 4); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.strokeStyle = '#fc6'; g.beginPath();
    const maxBin = Math.floor((8000 / (ctx.sampleRate / 2)) * f.length);
    for (let i = 0; i < maxBin; i++) { const x = (i / maxBin) * w; const y = h - ((f[i] + 110) / 110) * (h / 2); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    requestAnimationFrame(loop);
  };
  loop();
}

if (document.getElementById('params')) buildUI();
