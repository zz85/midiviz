% Cécile Chaminade: Idylle, Op. 126 No. 1 (1907), for piano.
% Primary source: Michael Rivers, ed., Album des enfants, 2ème série,
% Op. 126 (2022), IMSLP #764920, PDF pp. 1-2. Copyright © 2022
% Michael Rivers; licensed CC BY 4.0:
% https://creativecommons.org/licenses/by/4.0/
% Source PDF: https://s9.imslp.org/files/imglnks/usimg/f/fb/IMSLP764920-PMLP17544-Album-des-Enfants-Book-2_whole_book.pdf
% Attribution: score edition by Michael Rivers, 2022 (CC BY 4.0).
%
% Cross-checked bar by bar against the public-domain first-edition plates:
% Cécile Chaminade, Album des enfants, 2e série, Op. 126, Paris:
% Enoch et Cie., 1907, plate E. & C. 6648 (IMSLP #07316), PDF pp. 1-2
% (printed pp. 2-3):
% https://imslp.org/images/a/a1/Chaminade_-_Op.126_-Album_des_Enfants_2e-Serie.pdf
%
% Fingerings and page/system layout are omitted; musical content is retained.
% Only this LilyPond transcription and its original coding/markup contributions
% are dedicated to CC0 1.0. That dedication does not alter the CC BY 4.0
% status of Michael Rivers's edition or the attribution it requires:
% https://creativecommons.org/publicdomain/zero/1.0/

\version "2.24.0"

\header {
  title = "Idylle"
  subtitle = "Album des enfants, 2ème série"
  composer = "Cécile Chaminade"
  opus = "Op. 126 No. 1"
  dedication = "à Marie-Louise Promio"
}

rh = \absolute {
  \key c \major
  \time 6/8
  \tempo "Allegretto"
  \partial 4. g'8^\markup { \italic "dolce" }( _\markup { \italic "bien chanté" } f' e') |

  % 1-4
  f'4.( e''4.) |
  d''4. b'8( a' g') |
  c''4.( a'4.) |
  g'4. e'8( d' c') |

  % 5-8
  f'4.( d'8\< c' b\!) |
  c''4.->( b'8 a' g') |
  a'4.( <gis' b'>4.) |
  g'4.\> g'8\!( _\markup { \italic "dolce" } f' e') |

  % 9-13
  f'4.( e''4.) |
  d''4. b'8( a' g') |
  c''4.( gis'4.) |
  a'4. f'8( e' d' |
  g'4.) e'8( d' c' |

  % 14-18
  f'4.) e'8( d' c') |
  e'4. \acciaccatura { e'8( } <b d'>4.) |
  c'4. c''8\f( d'' e'' |
  a'8) r8 d''8( e''4 a''8) |
  g''4( eis''8) f''8( d'' b' |

  % 19-22
  a'8) r8 d''8( e''4 a''8) |
  g''4( d''8) b'8( c'' d'') |
  <fis' ais'>4.-> <gis' bis'>4. |
  <fis' ais'>4.-> c''8( d'' e'') |

  % 23-26
  <<
    { \voiceOne b'4( d''8) fis''4->( e''8) }
    \\
    { \voiceTwo s4. ais'4. }
  >> \oneVoice |
  <b' d''>8 r8 b'8 d''8( c'' b' |
  a'8) r8 d''8( e''4 g''8) |
  a''4( fis''8) g''8( d'' b' |

  % 27-30
  a'8) r8 d''8( e''4 a''8) |
  g''4( d''8) b'8( a' g') |
  a'4( c''8) b'8( a' g') |
  a'8( b' c'' b' a' g') |

  % 31-35
  c''4.^\markup { \bold "poco rit." } <c'' e''>4. |
  <b' g''>4.\fermata g'8\p( _\markup { \italic "dolce" } f' e') |
  f'4.^\markup { \bold "a tempo" }( e''4. |
  d''4.) b'8( a' g') |
  c''4.( a'4. |

  % 36-39
  g'4.) e'8( d' c') |
  f'4.->( e'8 d' c') |
  c''4.->( b'8 a' g') |
  b'4.( <gis' b'>4. |

  % 40-43
  g'4.) g'8( f' e') |
  f'4.( e''4. |
  d''4.) b'8( a' g') |
  c''4.( gis'4. |

  % 44-48
  a'4.) f'8( e' d') |
  g'4. e'8( d' c' |
  f'4.) e'8( ^\markup { \bold "poco rit." } d' c' |
  e'4.) \acciaccatura { e'8( } <b d'>4.) |
  c'4. r4. \bar "|."
}

lh = \absolute {
  \key c \major
  \time 6/8
  \partial 4. r4. |

  % 1-4
  c8( f b) r4. |
  d8( g c') r4. |
  c8( f b) f4. |
  c8( f b) r4. |

  % 5-8
  c8( f b c) r8 r8 |
  a8( c' eis') b8( c' cis') |
  c'8( b d) c'8( d c') |
  b8( g e) e8( g b) |

  % 9-13
  c8( f b) r4. |
  d8( g c') r4. |
  d8( aes c') r4. |
  f8( a c') r4. |
  g,8( d f) r4. |

  % 14-16
  a8( c' a g f e) |
  g4. <g, f>4. |
  <c e>4. r4. \clef treble |

  % 17-20: sustained lower voice under the moving eighth-note voice.
  <<
    { \voiceOne c'8( d' fis') s4. }
    \\
    { \voiceTwo c'4.~ c'4. }
  >> \oneVoice |
  <<
    { \voiceOne c'8( d' fis') b8( d' g') }
    \\
    { \voiceTwo c'4. b4. }
  >> \oneVoice |
  <<
    { \voiceOne c'8( d' fis') s4. }
    \\
    { \voiceTwo c'4.~ c'4. }
  >> \oneVoice |
  <<
    { \voiceOne b8( d' g') r4. }
    \\
    { \voiceTwo b4. s4. }
  >> \oneVoice \clef bass |

  % 21-22
  c'8( e' c'-.) b8( e' b-.) |
  c'8( e' d) r4. \clef treble |

  % 23-24
  d'8( g' d') cis'8( g' cis') |
  d'8( g' e') d'8( e' d') |

  % 25-28: sustained lower voice under the moving eighth-note voice.
  <<
    { \voiceOne c'8( d' fis') s4. }
    \\
    { \voiceTwo c'4.~ c'4. }
  >> \oneVoice |
  <<
    { \voiceOne c'8( d' fis') b8( d' g') }
    \\
    { \voiceTwo c'4. b4. }
  >> \oneVoice |
  <<
    { \voiceOne c'8( d' fis') s4. }
    \\
    { \voiceTwo c'4.~ c'4. }
  >> \oneVoice |
  <<
    { \voiceOne b8( d' g') r4. }
    \\
    { \voiceTwo b4. s4. }
  >> \oneVoice |

  % 29-32
  <<
    { \voiceOne c'8( f' g) d'8( f' g) }
    \\
    { \voiceTwo c'4. d'4. }
  >> \oneVoice |
  <<
    { \voiceOne c'8( f' g) d'8( f' g) }
    \\
    { \voiceTwo c'4. d'4. }
  >> \oneVoice |
  e'8( c' a) fis'8( c' a) |
  <a d'>4. r4. \clef bass |

  % 33-35
  d8( g b) r4. |
  f8( g d') r4. |
  e8( g c') f4. |

  % 36-39
  e8( g c') r4. |
  d8( g b) c4. |
  a8( c' eis') b8( c' cis') |
  c'8( b d) c'8( d c') |

  % 40-43
  b8( g f) e8( g c') |
  d8( g b) r4. |
  f8( g d') r4. |
  e8( bes c') r4. |

  % 44-48
  f8( a c') r4. |
  g,8( d f) r4. |
  a8( c' a) g8( f e) |
  g4. <g, f>4. |
  <c e>4. r4. \bar "|."
}

% Pedal changes are encoded in an otherwise silent voice in the lower staff.
pedal = {
  \time 6/8
  \partial 4. s4. |
  % 1-8
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff\sustainOn s8 s8 |
  s8\sustainOff s8 s8 s8 s8 s8 |
  % 9-16
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s2. | s2. | s2. |
  % 17-24
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff s8 s8 s8 s8 s8 |
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s2. |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s2. | s2. |
  % 25-32
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff\sustainOn s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s2. | s2. |
  s8\sustainOn s8 s8 s8\sustainOff\sustainOn s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  % 33-40
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff\sustainOn s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  % 41-48
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8 s8 s8 |
  s8\sustainOff\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s8\sustainOn s8 s8 s8\sustainOff s8 s8 |
  s2. | s2. |
}

\score {
  \new PianoStaff <<
    \new Staff = "upper" \rh
    \new Staff = "lower" <<
      \set Staff.pedalSustainStyle = #'mixed
      \new Voice = "leftNotes" { \clef bass \lh }
      \new Voice = "pedal" \pedal
    >>
  >>
  \layout { }
  \midi { }
}
