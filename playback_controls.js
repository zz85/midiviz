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
    // Original
    { value: 'JVKE - golden hour.mid', label: 'Golden Hour (JVKE)' },
    { value: 'Heart and Soul Piano Duet The Real Version.mid', label: 'Heart and Soul' },
    { value: 'entertainer.mid', label: 'The Entertainer' },
    { value: 'rush_e_real.mid', label: 'Rush E' },
    { value: 'minute_waltz.mid', label: 'Minute Waltz' },
    { value: 'rachmaninov3.mid', label: 'Rachmaninov 3' },
    { value: 'Toccata-and-Fugue-Dm.mid', label: 'Toccata and Fugue in D minor' },
    { value: 'hedwig_theme.mid', label: "Hedwig's Theme (Harry Potter)" },
    { value: 'Knight-Rupert-Schumann.mid', label: 'Knight Rupert (Schumann)' },
    { value: 'Prelude1.mid', label: 'Bach Prelude No.1' },
    { value: 'Fugue1.mid', label: 'Bach Fugue No.1' },
    // Classical
    { value: 'midis/bach_846.mid', label: 'Bach - Prelude in C Major BWV 846' },
    { value: 'midis/bach_847.mid', label: 'Bach - Prelude & Fugue BWV 847' },
    { value: 'midis/elise.mid', label: 'Beethoven - Für Elise' },
    { value: 'midis/mond_1.mid', label: 'Beethoven - Moonlight Sonata' },
    { value: 'midis/pathetique_1.mid', label: 'Beethoven - Pathétique Sonata' },
    { value: 'midis/chpn_op66.mid', label: 'Chopin - Fantaisie-Impromptu' },
    { value: 'midis/chpn-p15.mid', label: 'Chopin - Raindrop Prelude' },
    { value: 'midis/chpn_op27_2.mid', label: 'Chopin - Nocturne Op.27 No.2' },
    { value: 'midis/chpn_op10_e12.mid', label: 'Chopin - Revolutionary Etude' },
    { value: 'midis/chp_op18.mid', label: 'Chopin - Grande Valse Brillante' },
    { value: 'midis/deb_clai.mid', label: 'Debussy - Clair de Lune' },
    { value: 'midis/deb_pass.mid', label: 'Debussy - Passepied' },
    { value: 'midis/liz_et2.mid', label: 'Liszt - Etude No.2' },
    { value: 'midis/mz_331_1.mid', label: 'Mozart - Piano Sonata K.331' },
    { value: 'midis/mz_545_1.mid', label: 'Mozart - Piano Sonata K.545' },
    { value: 'midis/schuim-3.mid', label: 'Schubert - Impromptu No.3' },
    { value: 'midis/scn15_7.mid', label: 'Schumann - Träumerei' },
    { value: 'midis/grieg_halling.mid', label: 'Grieg - Halling' },
    // Modern
    { value: 'midis/river_flows_in_you.mid', label: 'Yiruma - River Flows in You' },
    { value: 'midis/kiss_the_rain.mid', label: 'Yiruma - Kiss the Rain' },
    { value: 'midis/nuvole_bianche.mid', label: 'Einaudi - Nuvole Bianche' },
    { value: 'midis/una_mattina.mid', label: 'Einaudi - Una Mattina' },
    { value: 'midis/fly_einaudi.mid', label: 'Einaudi - Fly' },
    { value: 'midis/comptine.mid', label: 'Tiersen - Comptine (Amélie)' },
    { value: 'midis/time_zimmer.mid', label: 'Zimmer - Time (Inception)' },
    { value: 'midis/interstellar.mid', label: 'Zimmer - Interstellar' },
    // Video Games
    { value: 'midis/ff_prelude.mid', label: 'Final Fantasy - Prelude' },
    { value: 'midis/ff_battle.mid', label: 'Final Fantasy - Battle' },
    { value: 'midis/zelda_overworld.mid', label: 'Zelda - Overworld Theme' },
    { value: 'midis/zelda_gerudo_valley.mid', label: 'Zelda - Gerudo Valley' },
    { value: 'midis/zelda_kakariko.mid', label: 'Zelda - Kakariko Village' },
    { value: 'midis/mario_theme.mid', label: 'Super Mario - Main Theme' },
    { value: 'midis/mario_ground.mid', label: 'Super Mario - Ground Theme' },
    { value: 'midis/mario_castle.mid', label: 'Super Mario - Castle Theme' },
    { value: 'midis/minecraft_sweden.mid', label: 'Minecraft - Sweden' },
    { value: 'midis/skyrim_sons.mid', label: 'Skyrim - Sons of Skyrim' },
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

  static defaultSoundfonts = [
    { value: 'soundfonts/TimGM6mb.sf2', label: 'TimGM6mb (5.7MB)' },
    { value: 'soundfonts/FluidR3.sf3', label: 'FluidR3 SF3 (19MB)' },
    { value: 'soundfonts/Pianoteq_M1_2026.sf2', label: 'Pianoteq M1 (19MB)' },
    { value: 'soundfonts/Full Grand Piano.sf2', label: 'Full Grand Piano (20MB)' },
    { value: 'soundfonts/GeneralUser GS v1.471.sf2', label: 'GeneralUser GS v1.471 (30MB)' },
    { value: 'soundfonts/GeneralUser-GS.sf2', label: 'GeneralUser GS (31MB)' },
    { value: 'soundfonts/Jnsgm2.sf2', label: 'Jnsgm2 (32MB)' },
    { value: 'soundfonts/JClive21.sf2', label: 'JClive21 (50MB)' },
    { value: 'soundfonts/FluidR3_GM.sf2', label: 'FluidR3 GM (142MB)' },
    { value: 'soundfonts/DSoundFontV4.sf2', label: 'DSoundFontV4 (553MB)' },
    { value: 'soundfonts/Motif_ES6_Concert_Piano.sf2', label: 'Motif ES6 Concert Piano (12.6MB)' },
    { value: 'soundfonts/Roland_Super_XP-80.sf2', label: 'Roland Super XP-80 (1.7MB)' },
    { value: 'soundfonts/Creative(emu10k1)8MBGMSFX.sf2', label: 'Creative emu10k1 (8MB)' },
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
    const sfSelect = hasFluidWeb && soundfonts.length ? `<input type="file" id="soundfontFile" accept=".sf2" hidden><select id="soundfontSelect"><option value="browse">Browse...</option>${sfOptions}</select>` : '';

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

    const sfSelect = $('#soundfontSelect');
    const sfFile = $('#soundfontFile');
    if (sfSelect) {
      this.lastSoundfont = sfSelect.value;
      sfSelect.onchange = () => {
        if (sfSelect.value === 'browse') {
          sfFile?.click();
          sfSelect.value = this.lastSoundfont;
        } else {
          this.lastSoundfont = sfSelect.value;
          if (this.instrument.loadSoundfont) this.instrument.loadSoundfont(sfSelect.value);
        }
      };
    }
    if (sfFile) {
      sfFile.onchange = () => {
        const file = sfFile.files[0];
        if (file && this.instrument.loadSoundfont) {
          const url = URL.createObjectURL(file);
          this.instrument.loadSoundfont(url);
          // Add to dropdown
          const opt = document.createElement('option');
          opt.value = url;
          opt.textContent = 'Loaded: ' + file.name;
          opt.selected = true;
          sfSelect.insertBefore(opt, sfSelect.firstChild.nextSibling);
          this.lastSoundfont = url;
        }
      };
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
    this._loadedFileName = file.name;
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
    this.trackChannels = {}; // trackNo -> channel
    this.trackInstruments = {}; // trackNo -> program number
    midi.tracks.forEach((track, trackNo) => {
      this.trackChannels[trackNo] = track.channel ?? trackNo;
      this.trackInstruments[trackNo] = track.instrument?.number ?? 0;
      track.notes.forEach(note => {
        this.allNotes.push({
          midi: note.midi,
          time: note.time,
          duration: note.duration,
          velocity: note.velocity,
          trackNo,
          channel: track.channel ?? trackNo
        });
      });
    });
    this.allNotes.sort((a, b) => a.time - b.time);
    if (this.allNotes.length) {
      const last = this.allNotes[this.allNotes.length - 1];
      this.duration = last.time + last.duration;
    }

    // Update dropdown with loaded file name
    if (this._loadedFileName && this.els.midiSelect) {
      const name = this.midi?.header?.name || this._loadedFileName.replace(/\.mid$/i, '');
      const opt = document.createElement('option');
      opt.value = 'loaded';
      opt.textContent = 'Loaded: ' + name;
      opt.selected = true;
      const existing = this.els.midiSelect.querySelector('option[value="loaded"]');
      if (existing) existing.remove();
      this.els.midiSelect.insertBefore(opt, this.els.midiSelect.firstChild);
      this.lastMidi = 'loaded';
      this._loadedFileName = null;
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
        const channel = note.channel ?? 0;
        this.instrument.noteOn(transposedMidi, note.velocity, channel);
        const color = this.trackColors[note.trackNo % this.trackColors.length];
        this.onNoteOn(note, color);
        setTimeout(() => this.instrument.noteOff(transposedMidi, channel), note.duration * 1000 / this.speed);
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
