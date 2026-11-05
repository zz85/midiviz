# Mutopia's LilyPond sources

The LilyPond sources of the Bach pieces in `midis/` marked \*, as the
[Mutopia Project](https://www.mutopiaproject.org) publishes them under
`ftp/BachJS/`, one folder each, unedited. `midis/tools/bach_ornaments.mjs` (and
`bach_goldberg_form.mjs`, `bach_hands.mjs`, `sheet/tools/goldberg.mjs`,
`sheet/tools/score_midi.mjs`) read them; a folder that is missing is fetched
again from Mutopia (its `.done` lists the files fetched).

Each file's header names its typesetter and its licence: Creative Commons
Attribution-ShareAlike 3.0 or 4.0, or public domain. `kern/` (CCARH's encodings
of the Bach-Gesellschaft edition, from humdrum-tools/bach-wtc on GitHub, which
states no licence) is not kept: it is fetched as it is needed.
