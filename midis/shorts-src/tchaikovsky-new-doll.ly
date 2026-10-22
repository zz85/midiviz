% Tchaikovsky: The New Doll (Новая кукла), Children's Album Op. 39 No. 9
% (No. 6 in the Schirmer edition, which follows the autograph's order).
% Transcribed for midiviz from the public-domain score: G. Schirmer, New York,
% 1904, ed. Adolf Ruthardt, plate 17224 (IMSLP #07996, p. 7). Notes only;
% fingerings omitted. This transcription is dedicated to the public domain (CC0).
% The score's sf on the climax chords is read as f, falling back to p with the hairpin.
% Compiled to midis/tchai_op39_9_new_doll.mid by midis/tools/build_shorts.mjs.
\version "2.24.0"
\header { title = "The New Doll" composer = "Pyotr Ilyich Tchaikovsky" opus = "Op. 39 No. 9" }

rh = \absolute {
  \key bes \major \time 3/8 \tempo 4 = 88
  r8 r f'\p |
  bes'4 a'8 | c''4 bes'8 | d''4 c''8 | ees''4 d''8 |
  <d'' g''>4\f c''8 | c''4\mf bes'8 | <bes' f''>4\mp a'8 | bes'8 r f'\p |
  bes'4 a'8 | c''4 bes'8 | d''4 c''8 | ees''4 d''8 |
  <d'' g''>4\mf c''8 | c''4\mp bes'8 | <bes' f''>4\mp a'8 | bes'8 r bes'\p |
  aes'8 r aes'' | g''8 r g' | a'8 r b' | c''8 r c''\mp |
  bes'8 r bes''\mf | a''8 r a' | b'8 r cis'' | d''8\f r cis'' |
  d''8\mf r aes'' | g''8 r g' | a'8 r b' | c''8\mp r b' |
  c''8 r g'' | f''8 r f' | g'8 r a' | bes'8 r f'\p |
  bes'4 a'8 | c''4 bes'8 | d''4 c''8 | ees''4 d''8 |
  <d'' g''>4\f c''8 | c''4\mf bes'8 | <bes' f''>4\mp a'8 | bes'8 r f'\p |
  bes'4 a'8 | c''4 bes'8 | d''4 c''8 | ees''4 d''8 |
  g'8 r c'' | f'8 r bes' | f''8\mp r a' | bes'8\p r c'' |
  fis'8 r a' | <f' bes'>8 r c'' | fis'8 r a' | <f' bes'>8 r a'\pp |
  bes'8 r cis'' | d''8 r ees'' | e''8 r f'' | <d'' bes''>8 r r\fermata \bar "|."
}

lh = \absolute {
  \key bes \major \time 3/8
  <bes d'>8-.\p q-. r | <c' ees'>-. q-. r | <d' f'>-. q-. r | <ees' g'>-. q-. r | <f' aes'>-. q-. r |
  <ees' g'>-.\f q-. r | <d' f'>-.\mf q-. r | <c' ees'>-.\mp q-. r | <bes d'>-.\p q-. r |
  <c' ees'>-. q-. r | <d' f'>-. q-. r | <ees' g'>-. q-. r | <f' aes'>-. q-. r |
  <ees' g'>-.\mf q-. r | <d' f'>-. q-. r | <c' ees'>-. q-. r | <bes d'>-.\p q-. r |
  <c' ees'>-. q-. r | <b d'>-. q-. r | <g f'>-. q-. r | <c' ees'>-.\mp q-. r |
  <d' f'>-.\mf q-. r | <cis' e'>-. q-. r | <a g'>-. q-. r | <d' fis'>-.\f q-. r |
  <c' f'>-.\mf q-. r | <b f'>-. q-. r | <g f'>-. q-. r | <c' ees'>-.\mp q-. r |
  <bes ees'>-. q-. r | <a ees'>-. q-. r | <f ees'>-. q-. r | <bes d'>-.\p q-. r |
  <c' ees'>-. q-. r | <d' f'>-. q-. r | <ees' g'>-. q-. r | <f' aes'>-. q-. r |
  <ees' g'>-.\f q-. r | <d' f'>-.\mf q-. r | <c' ees'>-.\mp q-. r | <bes d'>-.\p q-. r |
  <aes d'>-. q-. r | <g ees'>-. q-. r | <fis bes>-. q-. r | <f bes>-. q-. r |
  <ees bes>-. q-. r | <f d'>-. q-. r | <f ees'>-.\mp q-. r | <bes d'>-.\p q-. r |
  <bes ees'>-. q-. r | <bes d'>-. q-. r | <bes ees'>-. q-. r | <bes d'>-.\pp q-. r |
  <g ees'>-. q-. r | <f d'>-. q-. r | <d bes>-. q-. r | <bes, f>8 r r\fermata \bar "|."
}

\score {
  \new PianoStaff <<
    \new Staff = "upper" \rh
    \new Staff = "lower" { \clef bass \lh }
  >>
  \layout { }
  \midi { }
}
