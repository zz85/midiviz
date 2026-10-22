% Tchaikovsky: Baba Yaga (Баба-Яга, "The Witch"), Children's Album Op. 39 No. 20
% Transcribed for midiviz from the public-domain score: G. Schirmer, New York,
% 1904, ed. Adolf Ruthardt, plate 17224 (IMSLP #07996, pp. 23-24), marked
% Vivace (Tchaikovsky's own edition: Presto). Pitches were cross-checked bar by
% bar against Hans-Peter Beer's WIMA MIDI (IMSLP #156940); nothing else of it
% is used. Voices are merged into chords, which sounds the same. Fingerings
% omitted. This transcription is dedicated to the public domain (CC0).
% Compiled to midis/tchai_op39_20_baba_yaga.mid by midis/tools/build_shorts.mjs.
\version "2.24.0"
\header { title = "Baba Yaga" composer = "Pyotr Ilyich Tchaikovsky" opus = "Op. 39 No. 20" }

figA = << { e''8-. g''-. fis''-. e''-. d''-. c''-. } \\ { ais'4. s4. } >>
figB = << { e'''8-. g'''-. fis'''-. e'''-. d'''-. c'''-. } \\ { ais''4. s4. } >>

rh = \absolute {
  \key e \minor \time 6/8 \tempo 4 = 168
  \partial 4. r4. |
  <e' ais'>4.->\f r4 r8 | <e' b'>4.-> r4 r8 | \figA | <e' b'>4.-> r4 r8 |
  <e' ais'>4.-> r4 r8 | <e' b'>4.-> r4 r8 | \figA |
  <e' b'>8\p r r c''-. c''-. e'-. | <c' fis'>8 r r ees'-. ees'-. b-. |
  <b e'>8 r r c''-. c''-. e'-. | <c' fis'>8 r r ees'-. ees'-. b-. |
  <b e'>8 r r <b d'>-.\pp d'-. e'-. | <b d'>8-. d'-. e'-. <b d'>-. d'-. e'-. |
  b8-. b-. c'-. <b d'>-. d'-. e'-. | <b d'>8-. d'-. e'-. <d' f'>-. f'-. b'-. |
  <b e'>8 r r <b d'>-. d'-. e'-. | <b d'>8-. d'-. e'-. <b d'>-. d'-. e'-. |
  b8-. b-. c'-. <b d'>-. d'-. e'-. | <b d'>8-. d'-. e'-. <d' f'>-.\mp f'-. b'-. |
  <b e'>8 r r <e' g'>-.\mf g'-. c''-. | <c' fis'>8 r r <fis' a'>-. a'-. d''-. |
  <d' g'>8 r r <a' c''>-.\f c''-. fis''-. | <fis' b'>8 r r <a' c''>-. c''-. fis''-. |
  <fis' b'>8 r r r4 r8 |
  <e'' ais''>4.->\ff r4 r8 | <e'' b''>4.-> r4 r8 | \figB | <e'' b''>4.-> r4 r8 |
  <e'' ais''>4.-> r4 r8 | <e'' b''>4.-> r4 r8 | \figB |
  <e'' b''>8\f e'''-. d'''-. a''-. d'''-. c'''-. | g''8-.\mf c'''-. b''-. fis''-. b''-. a''-. |
  e''8-. e''-. d''-. a'-.\mp d''-. c''-. | g'8-. c''-. b'-. fis'-. b'-. a'-. |
  <b e'>8\p r r <gis b e'> r r | <a c' e'>8 r r <b dis'> r r |
  <g b e'>8 r r <gis b e'> r r | <a c' e'>8 r r <b dis'> r r |
  <g b e'>8\pp e'-. fis'-. <c' e'>-. e'-. fis'-. | <b e'>8 e'-. fis'-. <c' e'>-. e'-. fis'-. |
  <b g'>8 e'-. fis'-. <c' e'>-. e'-. fis'-. | <b e'>8 e'-. fis'-. <c' e'>-. e'-. fis'-. |
  <b g'>8 r r <g' e''>->\f r r | <g e'>8-> r r r4 r8 \bar "|."
}

lh = \absolute {
  \key e \minor \time 6/8
  \partial 4. c8-.\p e-. fis-. |
  <g c'>4. c8-. e-. fis-. | <g b>4. c8-. e-. fis-. | <g c'>4. c8-. e-. fis-. | <g b>4. c8-. e-. fis-. |
  <g c'>4. c8-. e-. fis-. | <g b>4. c8-. e-. fis-. | <g c'>4. c8-. e-. fis-. |
  <g b>8\p c' b <g bes> r r | <fis bes>8 bes a <b, fis> r r |
  <e a>8 a g <g bes> r r | <fis bes>8 bes a <b, fis> r r |
  <e a>8 a g <a, f> r r | <a, f>8 r r <a, f> r r |
  <gis, e>8 r r <a, f> r r | <a, f>8 r r <a b> r r |
  gis8 gis e <a, f> r r | <a, f>8 r r <a, f> r r |
  <gis, e>8 r r <a, f> r r | <a, f>8 r r <a b> r r |
  gis8 gis e <b c'> r r | a8 a fis <c' d'> r r |
  b8 b g <e' fis'> r r | dis'8 dis' b <e' fis'> r r |
  dis'8 dis' b c'-. e'-. fis'-. |
  <g' c''>4. c'8-. e'-. fis'-. | <g' b'>4. c'8-. e'-. fis'-. | <g' c''>4. c'8-. e'-. fis'-. | <g' b'>4. c'8-. e'-. fis'-. |
  <g' c''>4. c'8-. e'-. fis'-. | <g' b'>4. c'8-. e'-. fis'-. | <g' c''>4. c'8-. e'-. fis'-. |
  <g' b'>8 r r <a' c'' e''> r r | <b' e''>8 r r <b dis' a'> r r |
  <e' g'>8 r r <a c' e'> r r | <b e'>8 r r <b, dis a> r r |
  <e g>8 e d b, d c | a,8 c a, fis, b, g, |
  e,8 e d b, d c | a,8 c a, fis, b, g, |
  e,8 r r <a, e> r r | <g, e>8 r r <a, e> r r |
  e8 r r <a, e> r r | <g, e>8 r r <a, e> r r |
  e8 r r <e b> r r | <e, b,>8-> r r r4 r8 \bar "|."
}

\score {
  \new PianoStaff <<
    \new Staff = "upper" \rh
    \new Staff = "lower" { \clef bass \lh }
  >>
  \layout { }
  \midi { }
}
