/**
 * Playback Controls - Shared MIDI playback and instrument management
 * 
 * Usage:
 *   const playback = new PlaybackControls({
 *     midiSelect: '#midiSelect',
 *     midiFile: '#midiFile',
 *     instrumentSelect: '#instrumentSelect',
 *     playBtn: '#playBtn',
 *     pauseBtn: '#pauseBtn',
 *     progress: '#progress',
 *     time: '#time',
 *     speedRange: '#speedRange',
 *     speedVal: '#speedVal',
 *     onNoteOn: (note, color) => {},
 *     onLoad: (notes, duration) => {}
 *   });
 */
class PlaybackControls {
  static defaultMidiFiles = [
    { value: 'JVKE - golden hour.mid', label: 'Golden Hour (JVKE)' },
    { value: 'Heart and Soul Piano Duet The Real Version.mid', label: 'Heart and Soul' },
    { value: 'entertainer.mid', label: 'The Entertainer' },
    { value: 'rush_e_real.mid', label: 'Rush E' },
    { value: 'minute_waltz.mid', label: 'Minute Waltz' },
    { value: 'chpn-p15.mid', label: 'Chopin Prelude 15' },
    { value: 'rachmaninov3.mid', label: 'Rachmaninov 3' },
    { value: 'Toccata-and-Fugue-Dm.mid', label: 'Toccata and Fugue in D minor' },
    { value: 'hedwig_theme.mid', label: "Hedwig's Theme (Harry Potter)" },
    { value: 'Knight-Rupert-Schumann.mid', label: 'Knight Rupert (Schumann)' },
    { value: 'Prelude1.mid', label: 'Bach Prelude No.1' },
    { value: 'Fugue1.mid', label: 'Bach Fugue No.1' },
  ];

  static defaultInstruments = [
    { value: 'wavetable', label: 'Wavetable Piano' },
    { value: 'piano', label: 'Piano' },
    { value: 'fast', label: 'Fast Piano (88-key)' },
    { value: 'electric', label: 'Electric Piano' },
    { value: 'harpsichord', label: 'Harpsichord' },
    { value: 'organ', label: 'Church Organ' },
    { value: 'silent', label: "4'33\" (Silent)" },
  ];
  
  static fluidWebInstrument = { value: 'fluidweb', label: 'SoundFont (FluidWeb)' };

  constructor(opts = {}) {
    this.allNotes = [];
    this.duration = 0;
    this.lastPlayed = -1;
    this.lapse = 0;
    this.playing = false;
    this.speed = 1;
    this.start = null;
    this.seeking = false;
    this.midi = null;
    this.lastMidi = '';
    
    this.onNoteOn = opts.onNoteOn || (() => {});
    this.onLoad = opts.onLoad || (() => {});
    this.onPlay = opts.onPlay || (() => {});
    this.trackFilter = opts.trackFilter || (() => true);
    this.transpose = 0;
    this.tuning = 440;
    
    this.trackColors = ['#e91e63','#9c27b0','#3f51b5','#03a9f4','#009688','#8bc34a','#ffeb3b','#ff9800'];
    
    // Instruments
    this.instruments = {
      fast: () => new FastPiano(),
      piano: () => new Piano(),
      wavetable: () => new WavetablePiano(),
      electric: () => new ElectricPiano(),
      harpsichord: () => new Harpsichord(),
      organ: () => new ChurchOrgan(),
      silent: () => new SilentPiano()
    };
    if (typeof FluidWebPiano !== 'undefined') {
      this.instruments.fluidweb = () => new FluidWebPiano();
    }
    
    const defaultInst = (typeof FluidWebPiano !== 'undefined') ? 'fluidweb' : 'wavetable';
    this.instrument = this.instruments[defaultInst]();
    this.audioContext = this.instrument.ctx;
    
    if (opts.container) {
      this._injectHTML(opts.container, opts);
      this._bindElements({
        midiSelect: '#midiSelect',
        midiFile: '#midiFile',
        instrumentSelect: '#instrumentSelect',
        playBtn: '#playBtn',
        pauseBtn: '#pauseBtn',
        progress: '#progress',
        time: '#time',
        speedRange: '#speedRange',
        speedVal: '#speedVal'
      });
    } else {
      this._bindElements(opts);
    }
  }
  
  _injectHTML(container, opts) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    const midiFiles = opts.midiFiles || PlaybackControls.defaultMidiFiles;
    let instruments = opts.instruments || PlaybackControls.defaultInstruments;
    const hasFluidWeb = typeof FluidWebPiano !== 'undefined';
    if (hasFluidWeb) {
      instruments = [PlaybackControls.fluidWebInstrument, ...instruments];
    }
    
    const midiOptions = midiFiles.map((f, i) => `<option value="${f.value}"${i === 0 ? ' selected' : ''}>${f.label}</option>`).join('');
    const instOptions = instruments.map((i, idx) => `<option value="${i.value}"${idx === 0 ? ' selected' : ''}>${i.label}</option>`).join('');
    const soundfonts = opts.soundfonts || PlaybackControls.defaultSoundfonts || [];
    const sfOptions = soundfonts.map((sf, i) => `<option value="${sf.value}"${i === 0 ? ' selected' : ''}>${sf.label}</option>`).join('');
    const sfSelect = hasFluidWeb && soundfonts.length ? `<select id="soundfontSelect">${sfOptions}</select>` : '';
    
    el.innerHTML = `
      <input type="file" id="midiFile" accept=".mid,.midi" hidden>
      <select id="midiSelect"><option value="browse">Browse...</option>${midiOptions}</select>
      <select id="instrumentSelect">${instOptions}</select>
      ${sfSelect}
      <button id="playBtn">Play</button>
      <button id="pauseBtn">Pause</button>
      <span id="time">0:00</span>
      <input id="progress" type="range" value="0" min="0" max="1" step="0.001" style="width:200px">
      Speed: <input id="speedRange" type="range" value="1" min="0.2" max="10" step="0.1" style="width:100px">
      <span id="speedVal">1x</span>
    `;
  }
  
  _bindElements(opts) {
    const $ = s => s && document.querySelector(s);
    
    this.els = {
      midiSelect: $(opts.midiSelect),
      midiFile: $(opts.midiFile),
      instrumentSelect: $(opts.instrumentSelect),
      progress: $(opts.progress),
      time: $(opts.time),
      speedVal: $(opts.speedVal)
    };
    
    if (this.els.midiSelect) {
      this.lastMidi = this.els.midiSelect.value;
      this.els.midiSelect.onchange = () => {
        if (this.els.midiSelect.value === 'browse') {
          this.els.midiFile?.click();
          this.els.midiSelect.value = this.lastMidi;
        } else {
          this.lastMidi = this.els.midiSelect.value;
          this.loadMidi(this.els.midiSelect.value);
        }
      };
    }
    
    if (this.els.midiFile) {
      this.els.midiFile.onchange = () => this.loadMidiFile(this.els.midiFile.files[0]);
    }
    
    if (this.els.instrumentSelect) {
      this.els.instrumentSelect.onchange = () => this.switchInstrument(this.els.instrumentSelect.value);
    }
    
    if ($(opts.playBtn)) $(opts.playBtn).onclick = () => this.play();
    if ($(opts.pauseBtn)) $(opts.pauseBtn).onclick = () => this.pause();
    
    if (this.els.progress) {
      this.els.progress.onmousedown = () => this.seeking = true;
      this.els.progress.onmouseup = () => {
        this.seek(this.els.progress.value * this.duration);
        this.lastPlayed = -1;
        this.seeking = false;
      };
    }
    
    if ($(opts.speedRange)) {
      $(opts.speedRange).onchange = e => this.setSpeed(e.target.value);
    }
  }
  
  switchInstrument(type) {
    this.instrument = this.instruments[type]();
    this.audioContext = this.instrument.ctx;
  }
  
  loadMidi(file) {
    this.pause();
    this._reset();
    Midi.fromUrl(file).then(midi => this._processMidi(midi));
  }
  
  loadMidiFile(file) {
    if (!file) return;
    this.pause();
    this._reset();
    const reader = new FileReader();
    reader.onload = e => this._processMidi(new Midi(e.target.result));
    reader.readAsArrayBuffer(file);
  }
  
  _reset() {
    this.allNotes = [];
    this.lastPlayed = -1;
    this.lapse = 0;
    this.playing = false;
    this.speed = 1;
    this.start = null;
  }
  
  _processMidi(midi) {
    this.midi = midi;
    midi.tracks.forEach((track, trackNo) => {
      track.notes.forEach(note => {
        this.allNotes.push({
          midi: note.midi,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity,
          trackNo
        });
      });
    });
    this.allNotes.sort((a, b) => a.time - b.time);
    if (this.allNotes.length) {
      const last = this.allNotes[this.allNotes.length - 1];
      this.duration = last.time + last.duration;
    }
    this.onLoad(this.allNotes, this.duration, this.midi);
  }
  
  play() {
    this.instrument.resume();
    if (!this.playing) {
      this.playing = true;
      this.start = this.audioContext.currentTime - this.lapse / this.speed;
      this.onPlay();
    }
  }
  
  pause() {
    this.playing = !this.playing;
    if (this.playing) this.play();
  }
  
  stop() {
    this._reset();
  }
  
  seek(time) {
    this.lapse = time;
    this.start = this.audioContext.currentTime - this.lapse / this.speed;
  }
  
  setSpeed(val) {
    this.speed = +val;
    this.start = this.audioContext.currentTime - this.lapse / this.speed;
  }
  
  update() {
    if (this.playing) {
      this.lapse = (this.audioContext.currentTime - this.start) * this.speed;
    }
    
    // Play notes
    for (let i = this.lastPlayed + 1; i < this.allNotes.length; i++) {
      const note = this.allNotes[i];
      if (note.time > this.lapse) break;
      if (note.time >= this.lapse - 0.05 && this.trackFilter(note.trackNo)) {
        const transposedMidi = note.midi + this.transpose;
        this.instrument.noteOn(transposedMidi, note.velocity, this.tuning);
        const color = this.trackColors[note.trackNo % this.trackColors.length];
        this.onNoteOn(note, color);
        setTimeout(() => this.instrument.noteOff(transposedMidi), note.duration * 1000 / this.speed);
      }
      this.lastPlayed = i;
    }
    
    // Update UI
    if (!this.seeking && this.els.progress) {
      this.els.progress.value = this.lapse / this.duration;
    }
    if (this.els.time) {
      this.els.time.textContent = Math.floor(this.lapse/60) + ':' + (this.lapse%60).toFixed(1).padStart(4,'0');
    }
    if (this.els.speedVal) {
      this.els.speedVal.textContent = this.speed.toFixed(1) + 'x';
    }
  }
  
  getNoteColor(trackNo) {
    return this.trackColors[trackNo % this.trackColors.length];
  }
}
