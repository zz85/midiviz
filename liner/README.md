# Liner notes

X-Ray-style background for the pieces the players play: history, analysis,
trivia and things to listen for, tied to bars of the music. #032 Pianist shows
them in two layers:

- **Intertitles** on screen while the piece plays: a handful of short lines
  the notes mark for the screen (a kicker such as *Paris, 1853* over one line),
  faded in and out with room to read. Stories float (densest at the start,
  placed by a seeded generator); lines about the music come after it is heard,
  in a voice of their own.
- **Everything else** in the notes panel (press **I**, or click an
  intertitle): what is happening now, the overview and sections, every note
  with its source, and cards for the people and terms.

Plus sections on the seek bar and a card when you hover a song in the menu.
#038 Duo shows the same intertitles, panel and seek-bar sections (its Notes
menu picks what is on screen); it has no video export.
Visuals → Liner notes picks what shows on screen (intertitles, every note as a
caption, or nothing), the story and analysis styles, colours (black and
white by default), position (automatic, or a corner), whether the small
headings show, and the take of the floating intertitles. Render → Song title
adds the title (as the first intertitle, or the classic title card; off by
default). The video export
draws the same into the picture and saves it as YouTube subtitles (`.vtt`),
with the sections as chapters.

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
bars: 35                 # the score's bar count (the file must match, else a warning)
pickup: 1                # (optional) beats before bar 1
play: 1-64, 1-64, 65-200 # (optional) the score bars the file plays, in order (below)
screen: Johann Sebastian Bach | Prelude in C | The Well-Tempered Clavier, Book I
                         # (optional) the title as an intertitle: kicker | title | small line
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

## m30 · trivia
In 1853 Charles Gounod published a melody improvised over this prelude.

screen: Paris, 1853 | Gounod will sing an Ave Maria over these chords.

# Intertitles
## m2 Köthen, 1722
Bach begins a book of preludes in every key. This is the first.
```

- **Front matter**: `key: value` lines, `[a, b]` lists, `#` comments. All
  fields are optional; `bars` and `pickup` are used, the rest are shown.
- **Anchors**: `m22` (bar 22), `m22.3` (beat 3), `m22.2.5` (halfway through
  beat 2), `m22'` (bar 22 the second time through a repeat, `m22''` the
  third), or a time `@83.4` / `@1:23.4` for files with no bar grid. Bars are
  placed with the MIDI file's own time signatures and tempo map, so the
  notes follow any tempo, speed or rubato in the file. Number bars as the
  edition named in the front matter does.
- **Kinds**: `history`, `analysis`, `trivia`, `listen`, `technique` (each
  has its own colour; anything else becomes trivia, with a warning).
- **Text**: inline Markdown (`**bold**`, `*italic*`, `` `code` ``,
  `[text](url)`) and card links `[[pedal-point]]` or `[[pedal-point|pedal point]]`.
- **source:** a paragraph starting with `source:` is the citation. Every
  factual claim should have one.

## Intertitles

The on-screen lines, written separately from the notes because they are a
different voice: short, and few. They come in two kinds.

**Pinned** lines are about the music, so they belong where it happens:

- `screen: Kicker | Line` inside a moment. It appears at the moment's bar,
  or, when the moment has a range (`## m188-m190 · analysis`), when the
  range ends: after the listener has heard what it describes. The notes
  panel and the seek bar still show the moment where it starts.
- `## m24-m27 listen · Pedal point` in `# Intertitles` (anchor or range, an
  optional kind, the kicker), the line below.

**Floating** lines are stories (history, trivia) that fit anywhere:

- `aside: Kicker | Line` inside a moment: the moment stays at its bar in
  the panel, its intertitle floats.
- `## ~ Köthen, 1722` in `# Intertitles`, or `## ~m1-m64 Kicker` to keep it
  somewhere in those bars.

Floats keep their written order (so a story can run in time order) and are
placed by a seeded generator (`layoutScreen`, LAYOUT in `liner.js`): the
first 3–6 s in, then one every 20–30 s through the first 100 s, where
attention is highest, then the rest spread over what is left (±30 %), never
over a pinned line or within 3 s of one (a float that would run into one
goes before it if the rhythm allows, else after it), never in the last 10 s.
Visuals → Liner notes → *take* steps the seed: each take places the floats
differently, and the same take always places them the same way, on the page
and in the export (`&itseed=` in the address bar).

In every form `Line` can also be `Line | Small line`, and `screen: Line`
alone has no kicker.

Voices: an intertitle's kind (from its moment, or `analysis ·` in its
heading; `# Intertitles` lines are history by default) gives it a voice.
History and trivia are the story, in the Intertitle style (serif by
default); analysis, listen and technique are commentary, in the Analysis
style (spaced Montserrat by default, or *same as the story*).

Guidelines, checked by the tests and warned about in the console:

- One line of at most 14 words (8–12 is better); a kicker of a few words: a
  place and year, a bar, a term.
  The kicker is drawn at 0.36 of the line's size (the title's composer at 0.42).
- Each stays 1.2 s fading in, 2.5 s plus 0.3 s a word, and 1.5 s fading out
  (5–10 s); fades follow the song clock, so pausing holds one.
- Keep pinned lines 3 s apart, and the total under half the piece.
- Avoid ♯ and ♭ (the intertitle fonts are Latin only): write *F sharp*.

The song title is off by default, so the opening belongs to the
intertitles. Render → Song title can make it the first intertitle (the
front matter's `screen:` (kicker | title | small line), else composer over
title; for a song without notes, its name from the song list split at the
dash ("Chopin - Raindrop Prelude"), with the export subtitle as the small
line), or the classic title card. As an intertitle it shows from the first
note, a little larger than the others, for Render → Title hold seconds
(auto: 7–11 s by its words), fading in over 2.5 s and out over 2 s; pinned
lines it would crowd move later and the floats start after it. Under it the
director's opening shot comes up from black more slowly: half the hold,
3–8 s (2.5 s without the title). Headings off hides the kickers but not the title's.

Look (`liner/overlay.js`):

- Styles (INTERTITLE_STYLES): Serif (Cormorant Garamond, the kicker in
  spaced Cinzel capitals), Serif italic, Capitals (Cinzel), Modern sans
  (Montserrat, spaced).
- Colours (INTERTITLE_THEMES): black and white with grey headings (default),
  all white, black on light (for bright scenes), warm gold.
- Position (INTERTITLE_POSITIONS): automatic, or bottom left / right /
  centre, top left / right. Automatic puts each intertitle on the side of
  the frame away from the pianist (the middle of her head and hands as the
  camera sees them; the left when she is in the middle) and at the top when
  the shot looks down on the keys. It is decided once as each intertitle
  appears, on the page and in the export alike.

## Repeats and other mismatches: `play:`

Anchors name the score's bars. When the file plays something other than
bars 1, 2, 3… in order, `play:` lists the score bars it plays:

```
play: 1-64, 1-64, 65-186, 187*4, 188-200
```

is the Moonlight Sonata finale in `midis/mond_3.mid`: the exposition repeat
written out (so `m21` is the second theme the first time, `m21'` the second
time), and one score bar, the cadenza in bar 187, spread over four of the
file's bars (`187*4`; beats in it count on through those bars: `m187.5` is
the first beat of the second). The test warns when `play:` does not cover the
whole file, and anything anchored to a bar the file never plays is left out
with a warning.

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

- **Liner notes in the picture (as on screen)**: drawn into each frame,
  under the title card: the intertitles in the chosen style and position,
  or every note as a caption.
- **Save subtitles and YouTube chapters**: next to the MP4, whatever is on
  screen, two subtitle tracks and the chapters:
  - `<name>.vtt`: the intertitles (heading over line; the title too when it
    is one, and the floats as the current take places them),
  - `<name>.notes.vtt`: every note's caption (its first paragraph, with its
    kind: `[history] …`),
  - `<name>-chapters.txt`: the sections, to paste into the description.

  Upload each `.vtt` under Subtitles in YouTube Studio as its own track (for
  example English and English "Program notes"); viewers pick one in the
  player. All are timed to the video, title card and pre-roll included. Chapters follow YouTube's rules:
  the first at 0:00, at least three, each 10 s or longer (shorter sections
  merge into the one before).

Render → Length renders the whole song or a test clip: the first 20 s or
minute, or 20 s / a minute from where the song is now (seek there first).
A clip's file name says which part it is (`…_0-20s_1080p30.mp4`), its
`.vtt` holds only the lines inside it, and it has no chapters.

The notes panel can also copy the chapters or save either track (intertitles or all notes) timed to the song
itself.
