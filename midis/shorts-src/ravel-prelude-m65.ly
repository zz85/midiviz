% Maurice Ravel: Prélude in A minor, M.65 (1913), for piano.
% Primary source: Ray Alston, Piano Practical Editions, 2019, IMSLP #568194,
% pp. 3-4, Creative Commons Zero 1.0 (CC0):
% https://imslp.org/images/0/0f/PMLP14947-Pre-lude_%281913%29.pdf
% Cross-check: first edition, Paris: Durand & Cie., 1913, plate D. et F. 8895,
% IMSLP #918894, pp. 2-3, Public Domain:
% https://imslp.org/images/d/d9/PMLP14947-Ravel-M65-Prelude-FE.pdf
% Fingerings, cue-size alternative hand distribution, and layout are omitted.
% Only the transcription contribution made in this file is dedicated to CC0 1.0;
% the music and cited source editions retain their stated copyright status.

\version "2.24.0"
\header {
  title = "Prélude"
  composer = "Maurice Ravel"
  opus = "M.65"
  dedication = "à Mademoiselle Jeanne Leleu"
}

upper = \absolute {
  \clef treble
  \key a \minor
  \time 3/4
  \tempo "assez lent et très expressif (d'un rythme libre)" 4 = 60

  % 1
  r8 e''\p( fis'' d'' e'' fis'' |
  b''4 g'' d''~ |
  d''4 e'' g') |
  <d' fis' b'>2( <cis' f' c''>4 |
  <g c' e'>4. <dis' g'>8 <c' e'>4) |

  % 6
  \voiceOne
  <<
    { b'4.\<( d''8\! d'' c'' }
    \context Voice = "barSixLowerVoice" { \voiceTwo <d' fis'>2 <dis' fis'>4 }
  >>
  \oneVoice |
  <c' e'>4 <g' b'>4. <c' e'>8 |
  <g b e'>2.\> |
  a4\! ) r4 r4 |

  % 10
  r8 e'''\pp~( <e'' e'''> <d'' d'''> <e''~ e'''~>4 |
  <e'' e'''>4 <d'' d'''>8\< <b' b''> <a' a''> <b' b''>\! |
  <e'' e'''>4\> <d'' d'''>8 <g' g''> <b'~ b''~>4\! |
  <b' b''>4 <a' a''>8\< <g' g''> <e' e''> <g' g''> |

  % 14
  <b' b''>8\! <d'' d'''> <b' b''>4. <a' a''>8 |
  \tempo "ralenti"
  <b' b''>8 <e' e''>\> <g' g''>4. <g' g''>8\! )(
  |
  \tempo "au mouvement"
  <g' aes' c'' g''>2\arpeggio\p f''4 |
  <dis' a'>4. <d' c''>8 <dis' a'>4) |

  % 18
  <g' aes' c'' g''>4.\arpeggio( f''8 g'' c'' |
  <dis' a'>4. <d' c''>8 <dis' a'>4) |
  <bes d' a'>4\arpeggio\< ( g' f' |
  a'4. f'8 d' bes |
  d'2\! ) d'4--\>( \( |

  % 23
  \tempo "ralenti"
  \clef bass
  \voiceOne
  <<
    { d'4) c'4. b8 }
    \context Voice = "barTwentyThreeLowerVoice" { \voiceTwo <fis gis>4 <e gis> <d fis> }
  >>
  \oneVoice |
  <c e b>2. \) |
  r4 r4 r8\! \clef treble \tempo "très lent" e''8\pp( |
  fis''8 d'' e'' fis'' b''4~ |
  b''4\fermata ) r4 r4 \bar "|."
}

lower = \absolute {
  \clef bass
  \key a \minor
  \time 3/4

  % 1
  R2. |
  r8 a,(^\markup { \italic "con pedale" } e g c' e' |
  \clef treble g'8 c''8) r4 r4 |
  \clef bass r8 e,( e fis gis4) |
  r8 a,( e b g4) |

  % 6
  r8 e,( e fis gis4) |
  r8 a,( e b g4) |
  r8 d,( a, d e fis~ |
  \clef treble fis8 d' e' fis' a' d''8) |

  % 10
  <f'' a''>2 <g'' b''>4 |
  <f'' a''>2 <d'' f''>8 <e'' g''> |
  <f'' a''>2 <dis'' fis''>4 |
  <c'' e''>2( <ais' cis''>4 |
  <c'' e''>8 <dis'' fis''>4 <e'' g''>8 <c''~ e''~>4 |
  <c'' e''>8 <b' dis''>4 <bes' d''>8 <a' cis''>4) |

  % 16
  \clef bass r8 f( c' g' aes'4) |
  r8 cis eis b~ b4 |
  \clef treble r8 f( c' f' g' aes'8) |
  \clef bass r8 b, fis a~ a4 |
  r8 g,(\sustainOn d f bes d' |

  % 21
  \clef treble r8 <bes'~ d''~> <bes' d''>4) r4 |
  R2.\sustainOff |
  \clef bass e,2. |
  r8 a,,( e, b, c e |
  \clef treble b8 c' e' b' c''4 |
  b'4 c''8 d'' <c''~ e''~>4 |
  <c'' e'' c''' e'''>4\fermata ) r4 r4 \bar "|."
}

\score {
  \new PianoStaff <<
    \new Staff = "upper" \upper
    \new Staff = "lower" \lower
  >>
  \layout { }
  \midi { }
}
