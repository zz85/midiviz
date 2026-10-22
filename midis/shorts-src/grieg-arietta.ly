% Edvard Grieg: Arietta, Op. 12 No. 1
% Source used: Lyrische Stücke, Heft I, Op. 12, C. F. Peters No. 1269,
% plate 8460, Leipzig, n.d. [ca. 1895], ed. Adolf Ruthardt; score p. 3
% (scan PDF p. 5), Sibley Music Library item 1802/22702 / IMSLP #336077.
% This is an original piano edition and is explicitly marked Public Domain by
% both Sibley and IMSLP. The requested 1867 Chr. E. Horneman first-edition PDF
% (IMSLP #995554) was catalogue-verified as Public Domain but its file endpoint
% was unavailable to automated access; IMSLP's Horneman-edition incipit was used
% to cross-check bars 1-4. Fingerings and layout are omitted.
% Only this newly made transcription contribution is dedicated to CC0; that
% dedication does not purport to relicense the source scan or edition.
% Numeric tempos (quarter = 44, then 36 at the printed ritard.) are editorial
% playback realizations of the source's verbal markings.

\version "2.24.0"
\header {
  title = "Arietta"
  composer = "Edvard Grieg"
  opus = "Op. 12 No. 1"
}

global = {
  \key ees \major
  \time 2/4
}

upperMelody = \absolute {
  \set Score.tempoHideNote = ##t
  \tempo "Poco Andante e sostenuto" 4 = 44
  % 1-4
  g''8\p g''\< g'' g''\! |
  g''8\> e'' f''4\! |
  f''8 f''\< f'' f''\! |
  f''8\> d'' ees''4\! |

  % 5-8
  ees''8-. ees''( d'') d''( |
  c''8) c'' bes'4 |
  ees''8-. ees''( d''8)( bes'16 d'' |
  c''8) c'' bes'4 |

  % 9-13
  a'8( bes'16 c'' d''16\> f''8 ees''16)\! |
  fis'4( g') |
  f'8( g'16 aes' bes'16\> d''8 c''16)\! |
  ees'2 |
  \acciaccatura c''8 g''8-. g''\< g'' g''\! |

  % 14-17
  g''8\> e'' f''4\! |
  f''8 f''\< f'' f''\! |
  f''8\> d'' ees''4\! |
  bes'8( bes')-. a'8 f'16 a'16( |

  % 18-23
  aes'8)-. aes' g'4 |
  f'8( g'16 aes' bes'16\> d''8 c''16)\! |
  d'4( ees') |
  f'8( g'16 aes' bes'16\> d''8 c''16)\! |
  f'2 |
  \tempo "ritard." 4 = 36
  \acciaccatura c''8 g''8-.\pp\> g'' g'' g''\fermata\! \bar "|."
}

upperInner = \absolute {
  % 1-4
  s8 g'16( bes') s8 g'16( bes') |
  s8 aes'16( ces'') s8 aes'16( ces'') |
  s8 aes'16( ces'') s8 aes'16( ces'') |
  s8 g'16( bes') s8 g'16( bes') |

  % 5-8
  s8 ees'16( g') s8 ees'16( g') |
  s8 ees'16( g') s8 ees'16( g') |
  s8 ees'16( g') s8 ees'16( g') |
  s8 ees'16( g') s8 ees'16( g') |

  % 9-13
  s8 ees'16( g') r4 |
  c'4( bes) |
  s8 c'16( ees') r4 |
  a4.( bes8) |
  s8 g'16( bes') s8 g'16( bes') |

  % 14-17
  s8 aes'16( ces'') s8 aes'16( ces'') |
  s8 aes'16( ces'') s8 aes'16( ces'') |
  s8 g'16( bes') s8 g'16( bes') |
  s8 bes16( ees') s8 a16( ees') |

  % 18-23
  s8 aes16( ees') s8 bes16( ees') |
  s8 c'16( ees') r4 |
  aes4( g) |
  s8 c'16( ees') r4 |
  a4.( bes8) |
  s8 g'16( bes') s8 g'16\fermata( bes'\fermata) |
}

lowerArpeggios = \absolute {
  % 1-4
  bes16( ees') s8 bes16( ees') s8 |
  ces'16( d') s8 ces'16( d') s8 |
  ces'16( d') s8 ces'16( d') s8 |
  bes16( ees') s8 bes16( ees') s8 |

  % 5-8
  g16( a) s8 g16( bes) s8 |
  g16( c') s8 g16( bes) s8 |
  g16( a) s8 g16( bes) s8 |
  g16( c') s8 g16( bes) s8 |

  % 9-13
  g16( a) s4. |
  a4( g) |
  ees16( f) r4. |
  fis4.( g8) |
  bes16( ees') s8 bes16( ees') s8 |

  % 14-17
  ces'16( d') s8 ces'16( d') s8 |
  ces'16( d') s8 ces'16( d') s8 |
  bes16( ees') s8 bes16( ees') s8 |
  s16 ees16 s8 s16 ees16 s8 |

  % 18-23
  s16 ees16 s8 s16 ees16 s8 |
  ees16( f) r4. |
  f4( ees) |
  ees16( f) r4. |
  fis4.( g8) |
  bes16( ees') s8 bes16\fermata( ees'\fermata) s8 |
}

lowerBass = \absolute {
  % 1-4
  ees2\p~ | ees2 | ees2~ | ees2 |

  % 5-8
  c4 b, | aes, d | c b, | a, d |

  % 9-13
  c4 s4 |
  ees2 |
  aes,4 s4 |
  bes,2 |
  <ees, bes,>2 |

  % 14-17
  s2 |
  ees2~ |
  ees2 |
  des4 c |

  % 18-23
  f,4 g, |
  aes,4 s4 |
  bes,4( c) |
  aes,4 s4 |
  bes,2 |
  <ees, bes,>2\pp |
}

% Source pedal marks: Ped. at bars 1, 9, 11, 13 and 23; release stars at
% bars 9, 11 and the end. Repeated Ped. signs renew the pedal.
lowerPedal = {
  s2\sustainOn | s2*7 |
  s4\sustainOn s4\sustainOff |
  s2 |
  s4\sustainOn s4\sustainOff |
  s2 |
  s2\sustainOn | s2*9 |
  s2\sustainOn |
  s1*0\sustainOff
}

upper = <<
  \new Voice = "melody" { \voiceOne \global \upperMelody }
  \new Voice = "inner" { \voiceTwo \global \upperInner }
>>

lower = <<
  \new Voice = "arpeggios" { \voiceOne \global \lowerArpeggios }
  \new Voice = "bass" { \voiceTwo \global \lowerBass }
  \new Voice = "pedal" { \voiceThree \global \lowerPedal }
>>

\score {
  \new PianoStaff <<
    \new Staff = "upper" { \clef treble \upper }
    \new Staff = "lower" { \clef bass \lower }
  >>
  \layout { }
  \midi { }
}
