% Amy Beach: Secrets, Op. 25 No. 5 (1894), for piano.
% Primary source: Children's Carnival, Op. 25, first edition, Boston:
% Arthur P. Schmidt, 1894, plate A.P.S. 2961, IMSLP #888038,
% score PDF pp. 10-11. The edition and scan are Public Domain.
% Exact source PDF:
% https://imslp.org/images/a/ab/PMLP67745-Beach-ChildrensCarnivalOp25.pdf
% Cross-check: Amy Beach autograph manuscript, Library of Congress, A. P.
% Schmidt Company Archives, resource music.musapschmidt-10000662,
% manuscript pages 11-12. The collection is Public Domain and free to reuse:
% https://www.loc.gov/resource/music.musapschmidt-10000662/?sp=11
% https://tile.loc.gov/storage-services/public/music/musapschmidt-10000662/musapschmidt-10000662.pdf
%
% Fingerings and page/system layout are omitted. The source has no pedal marks.
% The first note of each ordinary beamed pair has a separate quarter-note stem:
% held-note and delayed-note voices below preserve that concealed sustain exactly.
% Staff-level slur engraving lets the opening pair slurs join those two voices.
% Only this newly made LilyPond transcription contribution is dedicated to
% CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/

\version "2.24.0"

\header {
  title = "Secrets"
  composer = "Amy Beach"
  opus = "Op. 25 No. 5"
}

global = {
  \key d \major
  \time 4/4
}

upperHeld = \absolute {
  \global
  \tempo "Andantino."

  % 1-3
  r4 a'4-- r4 a'4-- |
  r4 b'4-- r4 cis''4-- |
  r4 e''4-- r4 d''4-- |

  % 4-6
  r4 d''4-- r4 cis''4-- |
  r4 cis''4 r4 b'4 |
  r4 e''4 r4 e''4 |

  % 7-9
  r4 d''4 r4 cis''4 |
  r4 cis''4 r4 cis''4 |
  r4 a'4 r4 a'4 |

  % 10-12
  r4 b'4 r4 cis''4 |
  r4 e''4 r4 d''4 |
  r4 cis''4 r4 fis''4 |

  % 13-15
  r4 b'4 r4 e''4 |
  r4 a'4 r4 d''4 |
  r4 b'4 r4 cis''4 |

  % 16
  r4 d''4 r4 cis''4 |

  \repeat volta 2 {
    % 17-19
    r4 a'4 r4 a'4 |
    r4 a'4 r4 d''4 |
    r4 b'4 r4 a'4 |

    % 20-21
    r4 a'4 r4 fis''4 |
    r4 e''4 r4 fis''4 |

    % 22-24
    r4 g''8( fis'' e'' d'' cis'' b') |
    r4 e''8( d'' cis'' b' a' g') |
    r4 d''4 r4 cis''4 |

    % 25-27
    r4 a'4 r4 a'4 |
    r4 b'4 r4 cis''4 |
    r4 e''4 r4 d''4 |

    % 28-30
    r4 d''4 r4 cis''4 |
    r4 cis''4 r4 c''4 |
    r4 b'4 r4 bes'4 |

    % 31
    r4 a'4 r4 fis''4 |
  }
  \alternative {
    {
      % 32: first ending
      r8 fis'8( a' fis'~ <fis' d''>4 cis''8 b'8) |
    }
    {
      % 33: second ending
      r8 fis'8( a' fis'~ <fis' d''>4) r4 \bar "|."
    }
  }
}

upperEcho = \absolute {
  \global

  % 1-3
  s4 s8 fis''8 s4 s8 e''8 |
  s4 s8 d''8 s4 s8 a''8 |
  s4 s8 a''8 s4 s8 a''8 |

  % 4-6
  s4 s8 g''8 s4 s8 g''8 |
  s4 s8 fis''8 s4 s8 fis''8 |
  s4 s8 b'8 s4 s8 ais'8 |

  % 7-9
  s4 s8 b'8 s4 s8 gis'8 |
  s4 s8 fis'8 s4 s8 g'8 |
  s4 s8 fis''8 s4 s8 e''8 |

  % 10-12
  s4 s8 d''8 s4 s8 a''8 |
  s4 s8 a''8 s4 s8 a''8 |
  s4 s8 a''8 s4 s8 c''8 |

  % 13-15
  s4 s8 gis'8 s4 s8 g'8 |
  s4 s8 fis'8 s4 s8 a'8 |
  s4 s8 a'8 s4 s8 d''8 |

  % 16
  s4 s8 e''8 s4 s8 e''8 |

  \repeat volta 2 {
    % 17-19
    s4 s8 e''8 s4 s8 cis''8 |
    s4 s8 e''8 s4 s8 a'8 |
    s4 s8 e''8 s4 s8 cis''8 |

    % 20-21
    s4 s8 d''8 s4 s8 d''8 |
    s4 s8 d''8 s4 s8 d''8 |

    % 22-23: single-voice scale passages
    s1 |
    s1 |

    % 24-27
    s4 s8 g'8 s4 s8 g'8 |
    s4 s8 fis''8 s4 s8 e''8 |
    s4 s8 d''8 s4 s8 a''8 |
    s4 s8 a''8 s4 s8 a''8 |

    % 28-31
    s4 s8 g''8 s4 s8 g''8 |
    s4 s8 fis''8 s4 s8 a''8 |
    s4 s8 d''8 s4 s8 g''8 |
    s4 s8 fis'8 s4 s8 a'8 |
  }
  \alternative {
    { s1 | }
    { s1 | }
  }
}

lowerHeld = \absolute {
  \global
  \clef treble

  % 1-3
  d'4-- r4 cis'4-- r4 |
  d'4-- r4 e'4-- r4 |
  fis'4-- r4 b4-- r4 |

  % 4-6
  e'4-- r4 a4-- r4 |
  d'4 r4 d'4 r4 |
  cis'4 r4 cis'4 r4 |

  % 7-9
  b4 r4 b4 r4 |
  a4 r4 a4 r4 |
  d'4 r4 cis'4 r4 |

  % 10-12
  d'4 r4 e'4 r4 |
  fis'4 r4 f'4 r4 |
  e'4 r4 dis'4 r4 |

  % 13-15
  c'4 r4 c'4 r4 |
  d'4 r4 b4 r4 |
  e'4 r4 e'4 r4 |

  % 16
  a4 r4 a4 r4 |

  \repeat volta 2 {
    % 17-19
    cis'4 r4 a4 r4 |
    d'4 r4 d'4 r4 |
    cis'4 r4 a4 r4 |

    % 20-21
    d'4 r4 fis'4 r4 |
    g'4 r4 a'4 r4 |

    % 22-24
    b'4 r4 r2 |
    g'4 r4 r4 <b d'>4 |
    bes4 r4 a4 r4 |

    % 25-27
    d'4 r4 cis'4 r4 |
    d'4 r4 e'4 r4 |
    fis'4 r4 b4 r4 |

    % 28-30
    e'4 r4 a4 r4 |
    d'4 r4 d'4 r4 |
    g4 r4 g4 r4 |

    % 31
    a4 r4 a4 r4 |
  }
  \alternative {
    { a2. r4 | }
    { a2. r4 | }
  }
}

lowerEcho = \absolute {
  \global

  % 1-3
  s8 fis'8 s4 s8 g'8 s4 |
  s8 g'8 s4 s8 g'8 s4 |
  s8 a'8 s4 s8 fis'8 s4 |

  % 4-6
  s8 g'8 s4 s8 e'8 s4 |
  s8 fis'8 s4 s8 g'8 s4 |
  s8 g'8 s4 s8 fis'8 s4 |

  % 7-9
  s8 fis'8 s4 s8 eis'8 s4 |
  s8 d'8 s4 s8 e'8 s4 |
  s8 fis'8 s4 s8 g'8 s4 |

  % 10-12
  s8 g'8 s4 s8 g'8 s4 |
  s8 a'8 s4 s8 a'8 s4 |
  s8 a'8 s4 s8 a'8 s4 |

  % 13-15
  s8 e'8 s4 s8 e'8 s4 |
  s8 fis'8 s4 s8 fis'8 s4 |
  s8 a'8 s4 s8 gis'8 s4 |

  % 16
  s8 e'8 s4 s8 a'8 s4 |

  \repeat volta 2 {
    % 17-19
    s8 g'8 s4 s8 g'8 s4 |
    s8 g'8 s4 s8 fis'8 s4 |
    s8 g'8 s4 s8 g'8 s4 |

    % 20-21
    s8 fis'8 s4 s8 a'8 s4 |
    s8 b'8 s4 s8 c''8 s4 |

    % 22-24
    s8 d''8 s2. |
    s8 b'8 s2. |
    s8 e'8 s4 s8 e'8 s4 |

    % 25-27
    s8 fis'8 s4 s8 g'8 s4 |
    s8 g'8 s4 s8 g'8 s4 |
    s8 a'8 s4 s8 fis'8 s4 |

    % 28-30
    s8 g'8 s4 s8 e'8 s4 |
    s8 fis'8 s4 s8 fis'8 s4 |
    s8 g'8 s4 s8 d'8 s4 |

    % 31
    s8 d'8 s4 s8 cis'8 s4 |
  }
  \alternative {
    { s1 | }
    { s1 | }
  }
}

% The first-edition slurs in bars 1-4 cross from each held first note to the
% delayed second note. NullVoice guides retain those exact printed spans without
% duplicating any sounding event in either parser-readable piano part.
upperOpeningSlurs = \absolute {
  \global
  r4 a'8( fis''8) r4 a'8( e''8) |
  r4 b'8( d''8) r4 cis''8( a''8) |
  r4 e''8( a''8) r4 d''8( a''8) |
  r4 d''8( g''8) r4 cis''8( g''8) |
}

lowerOpeningSlurs = \absolute {
  \global
  d'8( fis'8) r4 cis'8( g'8) r4 |
  d'8( g'8) r4 e'8( g'8) r4 |
  fis'8( a'8) r4 b8( fis'8) r4 |
  e'8( g'8) r4 a8( e'8) r4 |
}

upperDynamics = {
  % 1-5
  s4\p s4^\markup { \italic "la melodia molto tenuto" } s2 |
  s1 | s1 | s1 | s1^\markup { \italic "simile" } |

  % 6-9: crescendo over the system break, then diminuendo.
  s4 s4\< s2 |
  s4 s4\! s2 |
  s1\> |
  s1\! |

  % 10-13: a second crescendo closes during bar 11.
  s4 s4\< s2 |
  s4 s4\! s2 |
  s1 |
  s1 |

  % 14-16
  s1^\markup { \italic "dim." } |
  s1 |
  s1\pp |

  \repeat volta 2 {
    % 17-21
    s1^\markup { \italic "dolce" } |
    s1 |
    s1 |
    s1^\markup { \italic "cresc." } |
    s1 |

    % 22-24
    s1\f |
    s2 s4\> s4 |
    s4 s8^\markup { \italic "poco rit." } s8\! s2 |

    % 25-28
    s1\pp^\markup { \italic "a tempo" } |
    s1 |
    s2 s4\< s4 |
    s1 |

    % 29-31
    s4\!^\markup { \italic "la seconda volta molto rit." } s4\> s2 |
    s1 |
    s1 |
  }
  \alternative {
    { s1\pp | }
    { s1\pp | }
  }
}

upper = <<
  \new Voice = "upperHeld" { \voiceOne \upperHeld }
  \new Voice = "upperEcho" { \voiceTwo \upperEcho }
  \new Voice = "upperDynamics" { \voiceThree \upperDynamics }
  \new NullVoice = "upperOpeningSlurs" \upperOpeningSlurs
>>

lower = <<
  \new Voice = "lowerHeld" { \voiceOne \lowerHeld }
  \new Voice = "lowerEcho" { \voiceTwo \lowerEcho }
  \new NullVoice = "lowerOpeningSlurs" \lowerOpeningSlurs
>>

\score {
  \new PianoStaff <<
    \new Staff = "upper" { \clef treble \upper }
    \new Staff = "lower" { \clef bass \lower }
  >>
  \layout {
    % The source's opening slurs join notes carried by different rhythmic voices.
    \context { \Voice \remove "Slur_engraver" }
    \context { \Staff \consists "Slur_engraver" }
  }
  \midi { }
}
