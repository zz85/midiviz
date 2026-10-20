# Recorded performances (#034 Performer)

How four violinists played Bach's Sonatas and Partitas, measured from their recordings in the [Bach Violin Dataset](https://github.com/salu133445/bach-violin-dataset) (Dong, Wu, Chen & McAuley, ICASSP 2022) and put on the notes of our MIDI files ([../midis](../midis/README.md)). Each file holds, per MIDI note, its onset and end as played and, for notes of 0.12 s or more whose pitch could be followed, its pitch curve (cents, 50 per second); and for the piece a level curve (dB) and the lane of dynamics #034 plays, corrected by listening (below). No audio.

| Violinist | Movements | Recording licence | Notes found |
|---|---|---|---|
| Emil Telmányi | 31 (all but the Ciaccona) | public domain (Musopen) | 98.4 % |
| John Garner | 8 (Partita No. 1) | CC BY 3.0 (Musopen) | 98.3 % |
| Ko Donghwi (Team DR) | 4 (Sonata No. 1) | CC BY 3.0 | 99.4 % |
| MinJi Kim | 4 (Sonata No. 2) | CC BY 3.0 | 96.9 % |

These are measurements of those recordings; credit the violinists and the dataset when using them. Each file names its source recording (`url`, `licence`). Collections under non-commercial or no-derivatives licences (Isabella Stewart Gardner Museum, Oliver Colbentson, Silei Li) were left out.

Built by `node violinist/tools/build_performances.js [recording …]` (needs the dataset in `strings/data/BachViolin`, which `node strings/test/ab_recording.js` downloads, and ffmpeg; about 15 minutes for all 47). Format and playback: [strings/expression.js](../../strings/expression.js); evaluation: `node strings/test/expression_ab.js`.
