# Recorded performances (#034 Performer)

How four violinists played Bach's Sonatas and Partitas, measured from their recordings in the [Bach Violin Dataset](https://github.com/salu133445/bach-violin-dataset) (Dong, Wu, Chen & McAuley, ICASSP 2022) and put on the notes of our MIDI files ([../midis](../midis/README.md)). Each file holds, per MIDI note, its onset and end as played and, for notes of 0.12 s or more whose pitch could be followed, its pitch curve (cents, 50 per second); and for the piece a level curve (dB) and the lane of dynamics #034 plays, corrected by listening (below). No audio.

| Violinist | Movements | Recording licence | Notes found |
|---|---|---|---|
| Emil Telmányi | 31 (all but the Ciaccona) | public domain (Musopen) | 98.4 % |
| John Garner | 8 (Partita No. 1) | CC BY 3.0 (Musopen) | 98.3 % |
| Ko Donghwi (Team DR) | 4 (Sonata No. 1) | CC BY 3.0 | 99.4 % |
| MinJi Kim | 4 (Sonata No. 2) | CC BY 3.0 | 96.9 % |

These are measurements of those recordings; credit the violinists and the dataset when using them. Each file names its source recording (`url`, `licence`). Collections under non-commercial or no-derivatives licences (Isabella Stewart Gardner Museum, Oliver Colbentson, Silei Li) were left out.

## Aligned here

These recordings come with no alignment; [strings/align.js](../../strings/align.js) finds the MIDI file's notes in them (and which of the score's repeats the player took, and whether an old recording sounds higher or lower). Fetched by `node violinist/tools/fetch_recordings.js` into the git-ignored `strings/data/recordings` (Wikimedia Commons; the 1915 double concerto from the Library of Congress National Jukebox through the Internet Archive; the QMUL Caprice from the Internet Archive). *Pitch where placed* checks the alignment without a reference: how often the note's pitch sounds in the middle of where it was put, against the same check 1.5 s late (chance).

| Recording | Piece | Licence | Pitch where placed (chance) |
|---|---|---|---|
| A violinist at Goodenough College (2014) | Sonata No. 1 in G minor, BWV 1001: I. Adagio | CC0 | 92 % (9 %) |
| Vicond | Sonata No. 1 in G minor, BWV 1001: I. Adagio | CC BY 3.0 | 86 % (11 %) |
| A violinist at Queen Mary University of London (2013) | Partita No. 2 in D minor, BWV 1004: I. Allemanda | CC0 | 99 % (10 %) |
| Vicond (2012) | Partita No. 2 in D minor, BWV 1004: I. Allemanda | CC BY 3.0 | 99 % (20 %) |
| Vicond | Partita No. 2 in D minor, BWV 1004: II. Corrente | CC BY 3.0 | 82 % (9 %) |
| Vicond | Partita No. 2 in D minor, BWV 1004: IV. Giga | CC BY 3.0 | 75 % (10 %) |
| Jascha Heifetz (1952) | Partita No. 2 in D minor, BWV 1004: V. Ciaccona (Chaconne) | Public domain | 89 % (10 %) |
| Yehudi Menuhin (1948) | Partita No. 3 in E major, BWV 1006: I. Preludio | Public domain | 93 % (23 %) |
| Vicond | Partita No. 3 in E major, BWV 1006: IV. Menuet I | CC BY 3.0 | 98 % (21 %) |
| Fritz Kreisler and Efrem Zimbalist (1915) | Concerto for Two Violins in D minor, BWV 1043: I. Vivace | Public domain | 27 % (4 %) – timing only |
| Unnamed soloist (IMSLP #77611) | Violin Concerto in D major, Op. 61: III. Rondo (Allegro) | Public domain | 38 % (8 %) – timing only |
| A violinist at Queen Mary University of London (2014) | Paganini, Caprice No. 24 | Public domain | 71 % (13 %) |
| Georg Kulenkampff, Berlin Philharmonic, Paul Kletzki (1932, two 78 sides) | Beethoven, Romance No. 2 in F major, Op. 50 | Public domain | 48 % (7 %) – timing only |
| Soloist with Philip Milman's orchestra (2022) | Vivaldi, Winter, RV 297: I. Allegro non molto | CC BY 3.0 | 24 % (4 %) – timing only |
| Jessica Dan, Air Force Strings (1999) | Vivaldi, Winter, RV 297: I. Allegro non molto | Public domain (US government work) | 10 % (3 %) – timing only, the least certain |

The ones with an orchestra give only their timing, read from all the parts (the violin's level and pitch cannot be measured under the orchestra; the accompaniment follows the tempo map stored with them). The QMUL Caprice is one of eight microphones of one take on the Internet Archive (`C414_L05`); the player takes every repeat but the first variation's, which the aligner found once it could try leaving out the repeats Mutopia's MIDI writes out. Menuhin's 1948 Caprice 24 with Adolph Baller (Commons) did not align (7 %, chance 2 %): it is an arrangement with piano. Albert Spalding's 1911 obbligato to the Bach–Gounod Ave Maria (Edison cylinder) did not align: another arrangement, at an unknown cylinder speed. On the Bach Violin Dataset (`node strings/test/align_eval.js`, 12 recordings, 8,974 notes) the aligner agrees with the dataset's own alignment within 32 ms (median; 87 % within 100 ms), finds the repeats every player took, and the note's pitch sounds where it places the note 91 % of the time against 83 % for the dataset's alignment.

Each recording's lane of dynamics is corrected by listening on both physical models (Source and Waveguide); the other engines use the Source model's.

Built by `node violinist/tools/build_performances.js [recording …]` (needs the dataset in `strings/data/BachViolin`, which `node strings/test/ab_recording.js` downloads, the fetched recordings, and ffmpeg; about an hour for all 58; `--dataset` or `--aligned` builds one kind). Format and playback: [strings/expression.js](../../strings/expression.js); evaluation: `node strings/test/expression_ab.js`.

## Adding a recording

A recording can be added when a piece in [../midis](../midis/README.md) has the violin part it plays, and its licence lets us share measurements with credit: public domain, CC0 or CC BY. Leave out NC and ND licences.

1. **Find the recording and check its licence.** Wikimedia Commons is the easiest source, because the fetch script reads each file's licence and credit from Commons. Check the file page yourself too: old recordings are sometimes uploaded with a wrong licence.
2. **Add it to the fetch list.** In [`tools/fetch_recordings.js`](../tools/fetch_recordings.js), add a line to `FILES`, keyed by a new id (`<violinist>_<work>_<movement>`, for example `heifetz_bwv1004_mov5`):
   ```js
   heifetz_bwv1004_mov5: ['File:Bach; Chaconne d-moll Heifetz.flac'],
   ```
   A second entry gives a mirror URL for files that Commons won't serve in full (the 1915 double concerto uses the Internet Archive's copy). Two other forms:
   - `{ parts: [title, …] }` for the sides of a 78 set: each side is fetched and checked, then they are joined into one FLAC. The aligner skips the break between sides like any silence (`kulenkampff_beethoven_romance2`).
   - `{ ia: identifier, name: file }` for a file of an Internet Archive item, with the licence read from the item's `licenseurl` (`qmul_paganini_caprice24`).
3. **Fetch it:** `node violinist/tools/fetch_recordings.js`. This writes the audio and its page, licence and credit (`sources.json`) into the git-ignored `strings/data/recordings`. The script skips files it already has and any file whose licence doesn't pass. It is slow on purpose, because Commons asks for few, spaced requests. For a recording that isn't on Commons, put the audio file in that folder and add its entry to `sources.json` by hand, with the same fields (`page`, `licence`, `credit`, `file`).
4. **Add it to the build list.** In [`tools/build_performances.js`](../tools/build_performances.js), add an entry to `RECORDINGS` with the same id:
   ```js
   { id: 'heifetz_bwv1004_mov5', midi: 'bach_1004_5_ciaccona.mid', violinist: 'Jascha Heifetz', year: 1952 },
   ```
   - `midi` is the piece's file in `../midis`. Give a list when you aren't sure which movement it is; the build keeps the one that aligns best (`qmul_allemanda` does this).
   - `year` matters for old recordings. Before 1930 the aligner also tries ±2 semitones, because 78s and cylinders often play back at the wrong speed.
   - Set `ensemble: true` when the violin plays with an orchestra, a piano or other players. The alignment then uses every part's notes, and only the timing is kept.
   - If the piece has a Mutopia score (`score` in `../midis/index.json`), the aligner tries each way of taking its repeats.
5. **Build it:** `node violinist/tools/build_performances.js <id>`. This takes a few minutes per movement, most of it the correction by listening on both engines. It writes `<id>.json` and updates this folder's `index.json`, leaving the other entries alone. It needs ffmpeg.
6. **Check the alignment.** The build prints *pitch where placed* and *chance*. The solo recordings so far score 75–99 % against 9–23 % by chance; the two with an orchestra score 27–38 %, which is enough for timing only. A score near chance means the recording didn't align: a different arrangement, cuts, or the wrong movement. Leave it out, as was done with Spalding's Ave Maria (a comment in `RECORDINGS` records why).
7. **Listen.** The Performer menu in #034, #037 and #038 lists every entry in `index.json` for the song, so the new player appears without any page changes. For example: `038_duo.html?song=<midi>&performer=<id>&violin=source`.
8. **Document and commit.** Add a row to the table in [Aligned here](#aligned-here), then commit `<id>.json`, `index.json` and the two scripts. The audio stays out of the repo.
