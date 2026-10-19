# Liner notes

X-Ray-style background for the pieces the players play: history, analysis,
trivia and things to listen for, tied to bars of the music. #032 Pianist shows
them as captions while a piece plays, as a notes panel (press **I**), as
sections on the seek bar and as a card when you hover a song in the menu. Its
video export burns the captions into the picture or saves them as YouTube
subtitles (`.vtt`) and chapters.

```
liner/
  index.json          song file → piece id
  pieces/<id>.md      one piece's notes
  cards/<id>.md       people, works and terms the notes link to
  liner.js            parser, bar clock, timeline, VTT / chapters, library (no DOM)
  overlay.js          captions, panel, seek-bar sections, menu peek, canvas captions
  test/liner.test.js  node --test liner/test/liner.test.js
```

## A piece: `pieces/<id>.md`

```markdown
---
title: Prelude in C major, BWV 846
composer: Johann Sebastian Bach
born: 1685
died: 1750
year: 1722
collection: The Well-Tempered Clavier, Book I, No. 1
key: C major
meter: 4/4
bars: 35                 # the file must have this many bars (else a warning)
pickup: 1                # (optional) beats before bar 1
cards: [bach, pedal-point]
---

Overview paragraphs (before any heading, or under `# Overview`). The first
one is the menu card.

# Sections
## m1 Home: C major
Optional text.
## m24 Dominant pedal

# Moments
## m22 · history
The caption: the first paragraph, one sentence that reads in about 4 s.

More paragraphs: shown in the notes panel.

source: Ledbetter (2002)

## m24–m31 listen
A moment with an end. Without one it stays for its reading time (4–9 s),
never into the next moment.
```

- **Front matter**: `key: value` lines, `[a, b]` lists, `#` comments. All
  fields are optional; `bars` and `pickup` are used, the rest are shown.
- **Anchors**: `m22` (bar 22), `m22.3` (beat 3), `m22.2.5` (halfway through
  beat 2), or a time `@83.4` / `@1:23.4` for files with no bar grid. Bars are
  placed with the MIDI file's own time signatures and tempo map, so the
  notes follow any tempo, speed or rubato in the file. Number bars as the
  edition named in the front matter does.
- **Kinds**: `history`, `analysis`, `trivia`, `listen`, `technique` (each
  has its own colour; anything else becomes trivia, with a warning).
- **Text**: inline Markdown (`**bold**`, `*italic*`, `` `code` ``,
  `[text](url)`) and card links `[[pedal-point]]` or `[[pedal-point|pedal point]]`.
- **source:** a paragraph starting with `source:` is the citation. Every
  factual claim should have one.

## A card: `cards/<id>.md`

```markdown
---
title: Pedal point
kind: term                # composer, performer, work, term, instrument…
subtitle: (optional)
---
Paragraphs. The first is the summary in the People & terms list.

source: (optional)
```

## Adding a piece

1. Write `pieces/<id>.md` and any new cards.
2. Map the song file to it in `index.json` (the path as the song list has it;
   a file of the same name elsewhere also matches).
3. `node --test liner/test/liner.test.js` checks that every card exists and
   every index entry has its MIDI and notes. Add a test like the Bach one to
   check the bar count and anchors against the file.

## Exported video

Render → Export has two options:

- **Liner-note captions in the picture**: drawn into each frame, under the
  title card.
- **Save subtitles (.vtt) and YouTube chapters**: next to the MP4,
  `<name>.vtt` (upload under Subtitles in YouTube Studio) and
  `<name>-chapters.txt` (paste into the description). Both are timed to the
  video, title card and pre-roll included. Chapters follow YouTube's rules:
  the first at 0:00, at least three, each 10 s or longer (shorter sections
  merge into the one before).

The notes panel can also copy the chapters or save a `.vtt` timed to the song
itself.
