# Afterglow's concert grand

`piano/` is the piano module of [Afterglow](https://github.com/Leonxlnx/afterglow) (scene/src/piano, v1.0),
copied unchanged under its MIT licence (`LICENSE`, which also says what in Afterglow is not MIT: the music
and the film; none of that is here). The one change: `layout_d.json` is `layout_d.js`, a module exporting the
same object, so it imports in browsers without an import attribute. Its own documentation is docs/PIANO.md in
Afterglow.

midiviz uses it through `../afterglow-piano.js` (`loadAfterglowPiano()`), which puts it in the page's
centimetres with the keys where concertstage/concert-grand.js has them, and drives keys, hammers, dampers,
pedals, lid and bench from noteOn / noteOff / setSustain. `?piano=afterglow` on #032 and #045.
