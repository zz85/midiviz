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

These recordings come with no alignment; [strings/align.js](../../strings/align.js) finds the MIDI file's notes in them (and which of the score's repeats the player took, and whether an old recording sounds higher or lower). Fetched by `node violinist/tools/fetch_recordings.js` into the git-ignored `strings/data/recordings` (Wikimedia Commons; the 1915 double concerto from the Library of Congress National Jukebox through the Internet Archive). *Pitch where placed* checks the alignment without a reference: how often the note's pitch sounds in the middle of where it was put, against the same check 1.5 s late (chance).

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

The two with an orchestra give only their timing, read from all the parts (the violin's level and pitch cannot be measured under the orchestra; the accompaniment follows the tempo map stored with them). Albert Spalding's 1911 obbligato to the Bach–Gounod Ave Maria (Edison cylinder) did not align: another arrangement, at an unknown cylinder speed. On the Bach Violin Dataset (`node strings/test/align_eval.js`, 12 recordings, 8,974 notes) the aligner agrees with the dataset's own alignment within 32 ms (median; 87 % within 100 ms), finds the repeats every player took, and the note's pitch sounds where it places the note 91 % of the time against 83 % for the dataset's alignment.

Each recording's lane of dynamics is corrected by listening on both physical models (Source and Waveguide); the other engines use the Source model's.

Built by `node violinist/tools/build_performances.js [recording …]` (needs the dataset in `strings/data/BachViolin`, which `node strings/test/ab_recording.js` downloads, the fetched recordings, and ffmpeg; about an hour for all 58; `--dataset` or `--aligned` builds one kind). Format and playback: [strings/expression.js](../../strings/expression.js); evaluation: `node strings/test/expression_ab.js`.
