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
    { value: '', label: '=== Selections ===', disabled: true },
    { value: 'C.V.Alkan - Etude sans opus.mid', label: 'Alkan - Etude sans opus' },
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
    { value: '', label: '=== Classical ===', disabled: true },
    { value: 'midis/bach_846.mid', label: 'Bach - Prelude in C Major BWV 846' },
    { value: 'midis/bach_847.mid', label: 'Bach - Prelude & Fugue BWV 847' },
    { value: 'midis/bach_toccata.mid', label: 'Bach - Toccata & Fugue in D minor' },
    { value: 'midis/bach_850.mid', label: 'Bach - Prelude & Fugue in D major BWV 850 (WTC I No.5)' },
    { value: 'midis/bach_goldberg_aria.mid', label: 'Bach - Goldberg Variations - Aria' },
    { value: 'midis/bach_goldberg.mid', label: 'Bach - Goldberg Variations BWV 988 (complete, 44 min)' },
    { value: 'midis/bach_wtc1_03.mid', label: 'Bach - WTC I No.3 in C-sharp major BWV 848' },
    { value: 'midis/bach_wtc1_04.mid', label: 'Bach - WTC I No.4 in C-sharp minor BWV 849' },
    { value: 'midis/bach_wtc1_06.mid', label: 'Bach - WTC I No.6 in D minor BWV 851' },
    { value: 'midis/bach_wtc1_08.mid', label: 'Bach - WTC I No.8 in E-flat minor BWV 853' },
    { value: 'midis/bach_wtc1_10.mid', label: 'Bach - WTC I No.10 in E minor BWV 855' },
    { value: 'midis/bach_wtc1_11.mid', label: 'Bach - WTC I No.11 in F major BWV 856' },
    { value: 'midis/bach_wtc1_12.mid', label: 'Bach - WTC I No.12 in F minor BWV 857' },
    { value: 'midis/bach_wtc1_15.mid', label: 'Bach - WTC I No.15 in G major BWV 860' },
    { value: 'midis/bach_wtc1_16.mid', label: 'Bach - WTC I No.16 in G minor BWV 861' },
    { value: 'midis/bach_wtc1_17.mid', label: 'Bach - WTC I No.17 in A-flat major BWV 862' },
    { value: 'midis/bach_wtc1_20.mid', label: 'Bach - WTC I No.20 in A minor BWV 865' },
    { value: 'midis/bach_wtc1_24.mid', label: 'Bach - WTC I No.24 in B minor BWV 869' },
    { value: 'midis/bach_wtc2_01.mid', label: 'Bach - WTC II No.1 in C major BWV 870' },
    { value: 'midis/bach_wtc2_02.mid', label: 'Bach - WTC II No.2 in C minor BWV 871' },
    { value: 'midis/bach_wtc2_06p.mid', label: 'Bach - WTC II No.6 in D minor BWV 875 (Prelude)' },
    { value: 'midis/elise.mid', label: 'Beethoven - Fur Elise' },
    { value: 'midis/mond_1.mid', label: 'Beethoven - Moonlight Sonata' },
    { value: 'midis/pathetique_1.mid', label: 'Beethoven - Pathetique Sonata' },
    { value: 'midis/mond_2.mid', label: 'Beethoven - Moonlight Sonata (2nd mvt)' },
    { value: 'midis/mond_3.mid', label: 'Beethoven - Moonlight Sonata (3rd mvt)' },
    { value: 'midis/pathetique_2.mid', label: 'Beethoven - Pathetique Sonata (2nd mvt, Adagio)' },
    { value: 'midis/pathetique_3.mid', label: 'Beethoven - Pathetique Sonata (3rd mvt)' },
    { value: 'midis/appass_1.mid', label: 'Beethoven - Appassionata Sonata (1st mvt)' },
    { value: 'midis/appass_3.mid', label: 'Beethoven - Appassionata Sonata (3rd mvt)' },
    { value: 'midis/waldstein_1.mid', label: 'Beethoven - Waldstein Sonata (1st mvt)' },
    { value: 'midis/chpn_op66.mid', label: 'Chopin - Fantaisie-Impromptu' },
    { value: 'midis/chpn-p15.mid', label: 'Chopin - Raindrop Prelude' },
    { value: 'midis/chpn_op27_2.mid', label: 'Chopin - Nocturne Op.27 No.2' },
    { value: 'midis/chpn_op10_e12.mid', label: 'Chopin - Revolutionary Etude' },
    { value: 'midis/chp_op18.mid', label: 'Chopin - Grande Valse Brillante' },
    { value: 'midis/chpn_op10_e01.mid', label: 'Chopin - Etude Op.10 No.1' },
    { value: 'midis/chpn_op10_e05.mid', label: 'Chopin - Black Key Etude Op.10 No.5' },
    { value: 'midis/chpn_op25_e1.mid', label: 'Chopin - Aeolian Harp Etude Op.25 No.1' },
    { value: 'midis/chpn_op25_e11.mid', label: 'Chopin - Winter Wind Etude Op.25 No.11' },
    { value: 'midis/chpn_op23.mid', label: 'Chopin - Ballade No.1 Op.23' },
    { value: 'midis/chp_op31.mid', label: 'Chopin - Scherzo No.2 Op.31' },
    { value: 'midis/chpn_op53.mid', label: 'Chopin - Heroic Polonaise Op.53' },
    { value: 'midis/chpn_op35_3.mid', label: 'Chopin - Funeral March (Sonata No.2)' },
    { value: 'midis/chpn-p4.mid', label: 'Chopin - Prelude in E minor Op.28 No.4' },
    { value: 'midis/chpn-p7.mid', label: 'Chopin - Prelude in A major Op.28 No.7' },
    { value: 'midis/chpn_op7_1.mid', label: 'Chopin - Mazurka Op.7 No.1' },
    { value: 'midis/deb_clai.mid', label: 'Debussy - Clair de Lune' },
    { value: 'midis/deb_pass.mid', label: 'Debussy - Passepied' },
    { value: 'midis/deb_prel.mid', label: 'Debussy - Suite bergamasque - Prelude' },
    { value: 'midis/deb_menu.mid', label: 'Debussy - Suite bergamasque - Menuet' },
    { value: 'midis/debussy_cc_1.mid', label: 'Debussy - Doctor Gradus ad Parnassum (Children\'s Corner)' },
    { value: 'midis/debussy_cc_2.mid', label: 'Debussy - Jimbo\'s Lullaby (Children\'s Corner)' },
    { value: 'midis/debussy_cc_3.mid', label: 'Debussy - Serenade for the Doll (Children\'s Corner)' },
    { value: 'midis/debussy_cc_4.mid', label: 'Debussy - The Snow is Dancing (Children\'s Corner)' },
    { value: 'midis/debussy_cc_5.mid', label: 'Debussy - The Little Shepherd (Children\'s Corner)' },
    { value: 'midis/debussy_cc_6.mid', label: 'Debussy - Golliwogg\'s Cakewalk (Children\'s Corner)' },
    { value: 'midis/liz_et2.mid', label: 'Liszt - Etude No.2' },
    { value: 'liz_liebestraum.mid', label: 'Liszt - Liebestraum No.3' },
    { value: 'midis/liz_rhap02.mid', label: 'Liszt - Hungarian Rhapsody No.2 (lassan and friska)' },
    { value: 'midis/liz_et3.mid', label: 'Liszt - La Campanella (Paganini Etude No.3)' },
    { value: 'midis/liz_et6.mid', label: 'Liszt - Paganini Etude No.6 (Theme and variations)' },
    { value: 'midis/liz_et_trans4.mid', label: 'Liszt - Transcendental Etude No.4 (Mazeppa)' },
    { value: 'midis/liz_et_trans5.mid', label: 'Liszt - Transcendental Etude No.5 (Feux follets)' },
    { value: 'midis/liz_rhap10.mid', label: 'Liszt - Hungarian Rhapsody No.10' },
    { value: 'midis/liz_rhap12.mid', label: 'Liszt - Hungarian Rhapsody No.12' },
    { value: 'midis/liz_rhap15.mid', label: 'Liszt - Hungarian Rhapsody No.15 (Rakoczy March)' },
    { value: 'midis/mz_331_1.mid', label: 'Mozart - Piano Sonata K.331' },
    { value: 'midis/mz_545_1.mid', label: 'Mozart - Piano Sonata K.545' },
    { value: 'midis/mz_331_3.mid', label: 'Mozart - Rondo alla Turca (K.331, 3rd mvt)' },
    { value: 'midis/mz_545_2.mid', label: 'Mozart - Piano Sonata K.545 (2nd mvt)' },
    { value: 'midis/mz_545_3.mid', label: 'Mozart - Piano Sonata K.545 (3rd mvt)' },
    { value: 'midis/mz_330_1.mid', label: 'Mozart - Piano Sonata K.330 (1st mvt)' },
    { value: 'midis/mz_332_1.mid', label: 'Mozart - Piano Sonata K.332 (1st mvt)' },
    { value: 'midis/mz_333_1.mid', label: 'Mozart - Piano Sonata K.333 (1st mvt)' },
    { value: 'midis/mz_570_1.mid', label: 'Mozart - Piano Sonata K.570 (1st mvt)' },
    { value: 'midis/schuim-3.mid', label: 'Schubert - Impromptu No.3' },
    { value: 'midis/schuim-1.mid', label: 'Schubert - Impromptu Op.90 No.1 (D.899)' },
    { value: 'midis/schuim-2.mid', label: 'Schubert - Impromptu Op.90 No.2' },
    { value: 'midis/schuim-4.mid', label: 'Schubert - Impromptu Op.90 No.4' },
    { value: 'midis/schumm-3.mid', label: 'Schubert - Moment Musical No.3' },
    { value: 'midis/schubert_d935_2.mid', label: 'Schubert - Impromptu Op.142 No.2 (D.935)' },
    { value: 'midis/schubert_d935_3.mid', label: 'Schubert - Impromptu Op.142 No.3 (Rosamunde variations)' },
    { value: 'midis/schub_d760_1.mid', label: 'Schubert - Wanderer Fantasy (1st mvt)' },
    { value: 'midis/schu_143_1.mid', label: 'Schubert - Piano Sonata D.784 (1st mvt)' },
    { value: 'midis/schub_d960_1.mid', label: 'Schubert - Piano Sonata D.960 (1st mvt)' },
    { value: 'midis/scn15_7.mid', label: 'Schumann - Traumerei' },
    { value: 'midis/scn15_1.mid', label: 'Schumann - Of Foreign Lands and Peoples (Kinderszenen)' },
    { value: 'midis/scn15_6.mid', label: 'Schumann - An Important Event (Kinderszenen)' },
    { value: 'midis/scn15_12.mid', label: 'Schumann - Child Falling Asleep (Kinderszenen)' },
    { value: 'midis/scn16_1.mid', label: 'Schumann - Kreisleriana No.1' },
    { value: 'midis/scn16_2.mid', label: 'Schumann - Kreisleriana No.2' },
    { value: 'midis/scn68_10.mid', label: 'Schumann - The Happy Farmer (Album for the Young)' },
    { value: 'midis/schum_abegg.mid', label: 'Schumann - Abegg Variations Op.1' },
    { value: 'midis/rac_op3_2.mid', label: 'Rachmaninoff - Prelude in C-sharp minor Op.3 No.2' },
    { value: 'midis/rac_op23_2.mid', label: 'Rachmaninoff - Prelude in B-flat major Op.23 No.2' },
    { value: 'midis/rac_op23_3.mid', label: 'Rachmaninoff - Prelude in D minor Op.23 No.3' },
    { value: 'midis/rac_op23_5.mid', label: 'Rachmaninoff - Prelude in G minor Op.23 No.5' },
    { value: 'midis/rac_op23_7.mid', label: 'Rachmaninoff - Prelude in C minor Op.23 No.7' },
    { value: 'midis/rac_op32_1.mid', label: 'Rachmaninoff - Prelude in C major Op.32 No.1' },
    { value: 'midis/rac_op32_13.mid', label: 'Rachmaninoff - Prelude in D-flat major Op.32 No.13' },
    { value: 'midis/rac_op33_5.mid', label: 'Rachmaninoff - Etude-Tableau Op.33 No.5' },
    { value: 'midis/rac_op33_6.mid', label: 'Rachmaninoff - Etude-Tableau Op.33 No.6' },
    { value: 'midis/rac_op33_8.mid', label: 'Rachmaninoff - Etude-Tableau Op.33 No.8' },
    { value: 'midis/tchai_pletnev_nutcracker_andante.mid', label: 'Tchaikovsky / Pletnev - Andante maestoso (Nutcracker Concert Suite)' },
    { value: 'midis/grieg_halling.mid', label: 'Grieg - Halling' },
    { value: 'midis/pachelbel_canon.mid', label: 'Pachelbel - Canon in D' },
    { value: '', label: '=== Symphonic ===', disabled: true },
    { value: 'midis/beethoven_sym5_1.mid', label: 'Beethoven - Symphony No.5 (1st mvt)' },
    { value: 'midis/beethoven_sym7_2.mid', label: 'Beethoven - Symphony No.7 (2nd mvt)' },
    { value: 'midis/mozart_sym40_1.mid', label: 'Mozart - Symphony No.40 (1st mvt)' },
    { value: 'midis/mozart_eine_kleine.mid', label: 'Mozart - Eine Kleine Nachtmusik' },
    { value: 'midis/dvorak_newworld_2.mid', label: 'Dvorak - New World Symphony (Largo)' },
    { value: 'midis/vivaldi_winter.mid', label: 'Vivaldi - Winter (Four Seasons)' },
    { value: 'midis/grieg_morning.mid', label: 'Grieg - Morning Mood (Peer Gynt)' },
    { value: 'midis/handel_hornpipe.mid', label: 'Handel - Water Music Hornpipe' },
    { value: '', label: '=== Modern ===', disabled: true },
    { value: 'midis/river_flows_in_you.mid', label: 'Yiruma - River Flows in You' },
    { value: 'midis/kiss_the_rain.mid', label: 'Yiruma - Kiss the Rain' },
    { value: 'midis/nuvole_bianche.mid', label: 'Einaudi - Nuvole Bianche' },
    { value: 'midis/una_mattina.mid', label: 'Einaudi - Una Mattina' },
    { value: 'midis/fly_einaudi.mid', label: 'Einaudi - Fly' },
    { value: 'midis/comptine.mid', label: 'Tiersen - Comptine (Amelie)' },
    { value: 'midis/time_zimmer.mid', label: 'Zimmer - Time (Inception)' },
    { value: 'midis/interstellar.mid', label: 'Zimmer - Interstellar' },
    { value: '', label: '=== Video Games ===', disabled: true },
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
    { value: 'midis/tetris.mid', label: 'Tetris - Type A' },
    { value: 'midis/last_of_us.mid', label: 'The Last of Us - Main Theme' },
    { value: 'midis/libertango.mid', label: 'Piazzolla - Libertango' },
  ];

  static defaultInstruments = [
    { value: '', label: '=== Procedural ===', disabled: true },
    { value: 'wavetable', label: 'Wavetable Piano' },
    { value: 'piano', label: 'Piano' },
    { value: 'fast', label: 'Fast Piano (88-key)' },
    { value: 'electric', label: 'Electric Piano' },
    { value: 'harpsichord', label: 'Harpsichord' },
    { value: 'organ', label: 'Church Organ' },
    { value: 'chiptune', label: 'Chiptune 8-bit' },
    { value: 'silent', label: "4'33\" (Silent)" },
  ];

  static defaultSoundfonts = [
    { value: 'soundfonts/Motif_ES6_Concert_Piano.sf2', label: '[Piano] Motif ES6 Concert Piano (12.6MB)' },
    { value: 'soundfonts/FluidR3.sf3', label: '[General] FluidR3 SF3 (19MB)' },
    { value: 'soundfonts/Creative(emu10k1)8MBGMSFX.sf2', label: '[General] Creative emu10k1 (8MB)' },
    { value: 'soundfonts/JClive21.sf2', label: '[General] JClive21 (50MB)' },
    { value: 'soundfonts/Full Grand Piano.sf2', label: '[Piano] Full Grand Piano (20MB)' },
    { value: 'soundfonts/Roland_Super_XP-80.sf2', label: '[Piano] Roland Super XP-80 (1.7MB)' },
  ];

  static defaultSoundfontStack = [
    'soundfonts/Creative(emu10k1)8MBGMSFX.sf2',
    'soundfonts/Motif_ES6_Concert_Piano.sf2',
  ];

  static get sf2OnlySoundfonts() {
    return this.defaultSoundfonts.filter(sf => sf.value.endsWith('.sf2'));
  }

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

    // Background playback via AudioWorklet (survives tab switching)
    this.useBackgroundClock = opts.useBackgroundClock || false;
    this._clock = null; // Lazy-initialized MidiClock

    this.trackColors = ['#e91e63','#9c27b0','#3f51b5','#03a9f4','#009688','#8bc34a','#ffeb3b','#ff9800'];

    // Instruments
    this.instruments = {
      fast: () => new FastPiano(),
      piano: () => new Piano(),
      wavetable: () => new WavetablePiano(),
      electric: () => new ElectricPiano(),
      harpsichord: () => new Harpsichord(),
      organ: () => new ChurchOrgan(),
      chiptune: () => new ChiptuneSynth(),
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

    const midiOptions = midiFiles.map((f, i) => `<option value="${f.value}"${f.disabled ? ' disabled' : ''}${!f.disabled && i === 1 ? ' selected' : ''}>${f.label}</option>`).join('');
    const instOptions = instruments.map((i, idx) => `<option value="${i.value}"${i.disabled ? ' disabled' : ''}${!i.disabled && idx === 0 ? ' selected' : ''}>${i.label}</option>`).join('');
    const soundfonts = opts.soundfonts || PlaybackControls.defaultSoundfonts || [];
    const sfOptions = soundfonts.map((sf, i) => `<option value="${sf.value}"${i === 0 ? ' selected' : ''}>${sf.label}</option>`).join('');
    const sfSelect = hasFluidWeb && soundfonts.length ? `<input type="file" id="soundfontFile" accept=".sf2,.sf3" hidden><select id="soundfontSelect"><option value="browse">Load custom soundfont...</option>${sfOptions}</select>` : '';

    el.innerHTML = `
      <input type="file" id="midiFile" accept=".mid,.midi" hidden>
      <select id="midiSelect"><option value="browse">Load custom MIDI...</option>${midiOptions}</select>
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
        this.lastPlayedCC = -1;
        this.seeking = false;
      };
    }

    if ($(opts.speedRange)) {
      $(opts.speedRange).onchange = e => this.setSpeed(e.target.value);
    }
  }

  switchInstrument(type) {
    const wasPlaying = this.playing;
    // Stop all notes on old instrument
    if (this.instrument.allNotesOff) {
      this.instrument.allNotesOff();
    } else {
      for (let i = 0; i < 128; i++) this.instrument.noteOff?.(i);
    }
    this.instrument = this.instruments[type]();
    this.audioContext = this.instrument.ctx;
    if (wasPlaying && this.audioContext) {
      this.start = this.audioContext.currentTime - this.lapse / this.speed;
    }
  }

  loadMidi(file) {
    const wasPlaying = this.playing;
    this.pause();
    this._reset();
    Midi.fromUrl(file).then(midi => {
      this._processMidi(midi);
      if (wasPlaying) this.play();
    });
  }

  loadMidiFile(file) {
    if (!file) return;
    const wasPlaying = this.playing;
    this.pause();
    this._reset();
    this._loadedFileName = file.name;
    const reader = new FileReader();
    reader.onload = e => {
      this._processMidi(new Midi(e.target.result));
      if (wasPlaying) this.play();
    };
    reader.readAsArrayBuffer(file);
  }

  _reset() {
    this.allNotes = [];
    this.allCC = [];
    this.lastPlayed = -1;
    this.lastPlayedCC = -1;
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
      // Extract control changes (sustain pedal, etc.)
      const cc = track.controlChanges;
      if (cc) {
        Object.keys(cc).forEach(ctrl => {
          cc[ctrl].forEach(ev => {
            this.allCC.push({ time: ev.time, ctrl: +ctrl, value: Math.round(ev.value * 127), channel: track.channel ?? trackNo });
          });
        });
      }
    });
    this.allNotes.sort((a, b) => a.time - b.time);
    this.allCC.sort((a, b) => a.time - b.time);
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
      if (this.useBackgroundClock) {
        this._ensureClock().then(() => {
          this._clock.load(this.allNotes, this.allCC);
          this._clock.setSpeed(this.speed);
          this._clock.play();
        });
      } else {
        this.start = this._getAudioContext().currentTime - this.lapse / this.speed;
      }
      this.onPlay();
    }
  }

  pause() {
    this.playing = !this.playing;
    if (this.playing) {
      this.play();
    } else if (this._clock) {
      this._clock.pause();
    }
  }

  stop() {
    if (this._clock) this._clock.pause();
    this._reset();
  }

  seek(time) {
    this.lapse = time;
    if (this._clock) {
      this._clock.seek(time);
    } else {
      this.start = this._getAudioContext().currentTime - this.lapse / this.speed;
    }
    this.lastPlayed = -1;
    this.lastPlayedCC = -1;
  }

  setSpeed(val) {
    this.speed = +val;
    if (this._clock) {
      this._clock.setSpeed(+val);
    } else if (this.audioContext) {
      this.start = this.audioContext.currentTime - this.lapse / this.speed;
    }
  }

  async _ensureClock() {
    if (this._clock?.ready) return;
    if (typeof MidiClock === 'undefined') {
      console.warn('MidiClock not loaded, falling back to RAF-based playback');
      this.useBackgroundClock = false;
      return;
    }
    this._clock = new MidiClock(this._getAudioContext());
    this._clock.onNoteOn = note => {
      if (!this.trackFilter(note.trackNo)) return;
      const midi = note.midi + this.transpose;
      const channel = note.channel ?? 0;
      if (this.instrument.programChange) {
        this.instrument.noteOn(midi, note.velocity, channel);
      } else {
        this.instrument.noteOn(midi, note.velocity);
      }
      this.onNoteOn(note, this.getNoteColor(note.trackNo));
    };
    this._clock.onNoteOff = note => {
      const midi = note.midi + this.transpose;
      const channel = note.channel ?? 0;
      if (this.instrument.programChange) {
        this.instrument.noteOff(midi, channel);
      } else {
        this.instrument.noteOff(midi);
      }
    };
    this._clock.onCC = cc => {
      this.instrument.controlChange?.(cc.channel, cc.ctrl, cc.value);
    };
    this._clock.onTime = lapse => {
      this.lapse = lapse;
    };
    await this._clock.init();
  }

  _getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = this.instrument._ensureContext?.() || this.instrument.ctx;
    }
    return this.audioContext;
  }

  update() {
    // When using background clock, it updates lapse via onTime callback
    if (this.playing && !this._clock) {
      this.lapse = (this._getAudioContext().currentTime - this.start) * this.speed;
    }

    // Stop at end of piece (with buffer for last notes to finish)
    if (this.playing && this.lapse >= this.duration + 2) {
      this.playing = false;
      if (this._clock) this._clock.pause();
      this.lapse = this.duration + 2;
    }

    // Play notes (skip if clock handles it)
    if (!this._clock) {
      for (let i = this.lastPlayed + 1; i < this.allNotes.length; i++) {
        const note = this.allNotes[i];
        if (note.time > this.lapse) break;
        if (note.time >= this.lapse - 0.05 && this.trackFilter(note.trackNo)) {
          const transposedMidi = note.midi + this.transpose;
          const channel = note.channel ?? 0;
          const supportsChannels = !!this.instrument.programChange;
          if (supportsChannels) {
            this.instrument.noteOn(transposedMidi, note.velocity, channel);
          } else {
            this.instrument.noteOn(transposedMidi, note.velocity);
          }
          const color = this.trackColors[note.trackNo % this.trackColors.length];
          this.onNoteOn(note, color);
          setTimeout(() => {
            if (supportsChannels) {
              this.instrument.noteOff(transposedMidi, channel);
            } else {
              this.instrument.noteOff(transposedMidi);
            }
          }, note.duration * 1000 / this.speed);
        }
        this.lastPlayed = i;
      }

      // Process control changes (sustain pedal, etc.)
      for (let i = this.lastPlayedCC + 1; i < this.allCC.length; i++) {
        const cc = this.allCC[i];
        if (cc.time > this.lapse) break;
        if (cc.time >= this.lapse - 0.05 && this.instrument.controlChange) {
          this.instrument.controlChange(cc.channel, cc.ctrl, cc.value);
        }
        this.lastPlayedCC = i;
      }
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
