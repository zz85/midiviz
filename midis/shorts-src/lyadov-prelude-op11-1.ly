% Anatoly Lyadov: Prelude in B minor, Op. 11 No. 1 (1886), for piano.
% Primary source: Polnoe Sobranie Sochinenii dlia Fortepiano, Vol. 1,
% pp. 132-143, eds. Konstantin Igumnov, Pavel Lamm and Lev Oborin,
% Moscow: Muzgiz, 1947, plate M. 18662 G; IMSLP #462489 / PMLP16302,
% explicitly marked Public Domain by IMSLP:
% https://imslp.org/images/8/87/PMLP16302-Op.11.pdf
% Earlier source located: Bessel's undated St. Petersburg anthology 7 Preludes,
% IMSLP #457392 / PMLP743482, also marked Public Domain. Its scan has page 20
% repeated and page 21 missing, and automated access was blocked, so it supplied
% bibliographic rather than complete note-level corroboration.
% Fingerings, hand-distribution cues, clef changes and layout are omitted.
% Numeric playback tempos realize the printed Moderato and the two rit./a tempo
% pairs at bars 40-41 and 56-57; they are not printed metronome marks.
% Only the transcription contribution made in this file is dedicated to CC0 1.0;
% the music and cited source editions retain their stated copyright status.

\version "2.24.0"
\header {
  title = "Prelude in B minor"
  composer = "Anatoly Lyadov"
  opus = "Op. 11 No. 1"
}

global = {
  \key b \minor
  \time 2/4
}

upperMelodyNotes = \absolute {
  % 1-5
  R2 |
  R2 |
  r8 fis''4(-> cis''8 |
  d''8 cis''8 b'8 fis''8) |
  e''2~ |
  % 6-10
  e''2 |
  e''4(-> fis''8 cis''8 |
  d''8 cis''8 b'8 a'8) |
  b'2->~ |
  b'4 r4 |
  % 11-15
  r8 cis''4(-> gis'8 |
  a'8 gis'8 fis'8 cis''8) |
  b'2~ |
  b'2 |
  b'4(-> cis''8 gis'8 |
  % 16-20
  a'8 gis'8 fis'8 e'8) |
  fis'2->~ |
  fis'4 r4 |
  fis'8( a'8 b'8 cis''8) |
  <fis' fis''>2 |
  % 21-25
  fis'8( a'8 b'8 cis''8) |
  <fis' fis''>2 |
  <fis' fis''>8( <a' a''>8 <b' b''>8 <cis'' cis'''>8) |
  <e'' e'''>8( <d'' d'''>8 <cis'' cis'''>8 <b' b''>8) |
  <cis'' cis'''>4( <b' b''>8. cis'''32 b''32) |
  % 26-30
  <fis' fis''>4 fis'4->~ |
  fis'8( a'8 b'8 cis''8) |
  e''8( d''8 cis''8 b'8) |
  a'4( gis'8. a'32 gis'32) |
  fis'2( |
  % 31-35
  \tuplet 3/2 { g'8) d'''8( a''8 } \tuplet 3/2 { b''8 a''8 g''8 } |
  \tuplet 3/2 { e''8 d''8 a'8 } \tuplet 3/2 { b'8 a'8 g'8 } |
  \tuplet 3/2 { e'8 d'8 a8 } \tuplet 3/2 { b8 a8 g8 } |
  e8 d8) g'8( fis'8 |
  eis'8) r8 b'4(->~ |
  % 36-40
  b'4 cis''4) |
  cis''8 r8 r4 |
  \tuplet 3/2 { cis'8( g'8 eis'8 } \tuplet 3/2 { fis'8 ais'8 d''8 } |
  \tuplet 3/2 { cis''8 g''8 eis''8 } \tuplet 3/2 { fis''8 ais''8 d'''8 } |
  \tuplet 3/2 { r8 r8 fis''8~ } fis''4) |
  % 41-45
  r8 fis''4(-> cis''8 |
  d''8 cis''8 b'8 fis''8) |
  e''2~ |
  e''2 |
  r8 e''4(-> b'8 |
  % 46-50
  c''8 b'8 a'8 e''8) |
  d''2~ |
  d''2 |
  r8 d''4(-> a'8 |
  b'8 a'8 g'8 e''8) |
  % 51-55
  d''2(~ |
  d''4. e''8) |
  d''2(~ |
  d''4. e''8) |
  d''2~ |
  % 56-60
  d''2 |
  b'8( d''8 e''8 fis''8) |
  <b' b''>2 |
  b'8( d''8 e''8 fis''8) |
  <b' b''>2 |
  % 61-65
  <b' b''>8( <d'' d'''>8 <e'' e'''>8 <fis'' fis'''>8) |
  <a'' a'''>8( <g'' g'''>8 <fis'' fis'''>8 <e'' e'''>8) |
  <fis'' fis'''>4( <e'' e'''>8. fis'''32 e'''32) |
  <b' b''>4 b'4->~ |
  b'8( d''8 e''8 fis''8) |
  % 66-70
  a''8( g''8 fis''8 e''8) |
  d''4( cis''8. d''32 cis''32) |
  b'2( |
  \tuplet 3/2 { c''8) g'''8( d'''8 } \tuplet 3/2 { e'''8 d'''8 c'''8 } |
  \tuplet 3/2 { a''8 g''8 d''8 } \tuplet 3/2 { e''8 d''8 c''8 } |
  % 71-75
  \tuplet 3/2 { a'8 g'8 d'8 } \tuplet 3/2 { e'8 d'8 c'8 } |
  a8 g8) c''8( b'8 |
  ais'8) r8 e''4(->~ |
  e''4 fis''4) |
  fis''4.( cis''8 |
  % 76-78
  d''8 cis''8 b'4) |
  R2 |
  <d b>2\fermata |
}

upperInnerNotes = \absolute {
  % 1-5
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 6-10
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 11-15
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 16-20
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 21-25
  s2 |
  s2 |
  s1*1/4 fis''4 |
  fis''4 e''4 |
  e''4 eis''4 |
  % 26-30
  s1*1/4 e'4( |
  \tuplet 3/2 { d'8) <d' fis'>8 <d' fis'>8 } \tuplet 3/2 { <d' fis'>8 <d' fis'>8 <d' fis'>8 } |
  \tuplet 3/2 { <d' fis'>8 <d' fis'>8 <d' g'>8 } \tuplet 3/2 { <d' gis'>8 <d' gis'>8 <d' gis'>8 } |
  \tuplet 3/2 { cis'8 <a cis'>8 <a cis'>8 } \tuplet 3/2 { <a cis'>8 <a cis'>8 <a cis'>8 } |
  \tuplet 3/2 { <a d'>8 <a d'>8 <a d'>8 } \tuplet 3/2 { <a d'>8 <a d'>8 <a d'>8 } |
  % 31-35
  <g d'>8 s1*3/8 |
  s2 |
  s2 |
  s1*1/4 d'4 |
  \tuplet 3/2 { <d' eis'>8 <d' eis'>8 <d' eis'>8 } \tuplet 3/2 { <d' eis'>8\arpeggio <d' eis'>8 <d' eis'>8 } |
  % 36-40
  \tuplet 3/2 { <d' fis'>8 <d' fis'>8 <d' fis'>8 } \tuplet 3/2 { <cis' gis'>8 <cis' gis'>8 <cis' gis'>8 } |
  <cis' g'>8 s1*3/8 |
  s2 |
  s2 |
  \tuplet 3/2 { cis'''8 fis'''8 fis''8 } \tuplet 3/2 { e''8 d''8 cis''8 } |
  % 41-45
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 46-50
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 51-55
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 56-60
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 61-65
  s1*1/4 b''4 |
  b''4 a''4 |
  a''4 ais''4 |
  s1*1/4 a'4( |
  \tuplet 3/2 { g'8) <g' b'>8 <g' b'>8 } \tuplet 3/2 { <g' b'>8 <g' b'>8 <g' b'>8 } |
  % 66-70
  \tuplet 3/2 { <g' b'>8 <g' b'>8 <g' c''>8 } \tuplet 3/2 { <g' cis''>8 <g' cis''>8 <g' cis''>8 } |
  \tuplet 3/2 { fis'8 <d' fis'>8 <d' fis'>8 } \tuplet 3/2 { <d' fis'>8 <d' fis'>8 <d' fis'>8 } |
  \tuplet 3/2 { <d' g'>8 <d' g'>8 <d' g'>8 } \tuplet 3/2 { <d' g'>8 <d' g'>8 <d' g'>8 } |
  <c' g'>8 s1*3/8 |
  s2 |
  % 71-75
  s2 |
  s1*1/4 g'4 |
  \tuplet 3/2 { <g' ais'>8 <g' ais'>8 <g' ais'>8 } \tuplet 3/2 { <g' ais'>8\arpeggio <g' ais'>8 <g' ais'>8 } |
  \tuplet 3/2 { <g' b'>8 <g' b'>8 <g' b'>8 } \tuplet 3/2 { <fis' cis''>8 <fis' cis''>8 <fis' cis''>8 } |
  <fis' b'>2\arpeggio~ |
  % 76-78
  <fis' b'>8 s1*3/8 |
  s2 |
  s2 |
}

lowerArpeggioNotes = \absolute {
  % 1-5
  \tuplet 3/2 { <b fis'>8( <d' b'>8 <b fis'>8 } \tuplet 3/2 { <d' b'>8 <b fis'>8 <d' b'>8 } |
  \tuplet 3/2 { <b fis'>8 <d' b'>8 <b fis'>8 } \tuplet 3/2 { <d' b'>8 <b fis'>8 <d' b'>8) } |
  \tuplet 3/2 { <b fis'>8( <d' b'>8 <b fis'>8 } \tuplet 3/2 { <d' b'>8 <b fis'>8 <d' b'>8 } |
  \tuplet 3/2 { <a fis'>8 <d' b'>8 <a fis'>8 } \tuplet 3/2 { <d' b'>8 <a fis'>8 <d' b'>8) } |
  \tuplet 3/2 { <gis e'>8( <d' b'>8 <gis e'>8 } \tuplet 3/2 { <d' b'>8 <gis e'>8 <d' b'>8 } |
  % 6-10
  \tuplet 3/2 { <gis e'>8 <cis' b'>8 <gis e'>8 } \tuplet 3/2 { <cis' b'>8 <gis e'>8 <cis' b'>8) } |
  \tuplet 3/2 { <g e'>8( <cis' b'>8 <g e'>8 } \tuplet 3/2 { <cis' b'>8 <fis e'>8 <cis' ais'>8 } |
  \tuplet 3/2 { <fis d'>8 <b a'>8 <fis d'>8 } \tuplet 3/2 { <b a'>8 <fis d'>8 <b a'>8) } |
  \tuplet 3/2 { <fis d'>8( <b gis'>8 <fis d'>8 } \tuplet 3/2 { <b gis'>8 <fis d'>8 <b gis'>8 } |
  \tuplet 3/2 { <eis d'>8 <b gis'>8 <eis d'>8 } \tuplet 3/2 { <b gis'>8 <eis cis'>8 <b gis'>8) } |
  % 11-15
  \tuplet 3/2 { <fis cis'>8( <a fis'>8 <fis cis'>8 } \tuplet 3/2 { <a fis'>8 <fis cis'>8 <a fis'>8 } |
  \tuplet 3/2 { <e cis'>8 <a fis'>8 <e cis'>8 } \tuplet 3/2 { <a fis'>8 <e cis'>8 <a fis'>8) } |
  \tuplet 3/2 { <dis b>8( <a fis'>8 <dis b>8 } \tuplet 3/2 { <a fis'>8 <dis b>8 <a fis'>8 } |
  \tuplet 3/2 { <dis b>8 <gis fis'>8 <dis b>8 } \tuplet 3/2 { <gis fis'>8 <dis b>8 <gis fis'>8) } |
  \tuplet 3/2 { <d b>8( <gis fis'>8 <d b>8 } \tuplet 3/2 { <gis fis'>8 <cis b>8 <gis eis'>8 } |
  % 16-20
  \tuplet 3/2 { <cis a>8 <fis e'>8 <cis a>8 } \tuplet 3/2 { <fis e'>8 <cis a>8 <fis e'>8) } |
  \tuplet 3/2 { <cis a>8( <fis dis'>8 <cis a>8 } \tuplet 3/2 { <fis dis'>8 <cis a>8 <fis dis'>8 } |
  \tuplet 3/2 { <bis, a>8 <fis dis'>8 <bis, a>8 } \tuplet 3/2 { <fis d'>8 <bis, a>8 <fis d'>8) } |
  \tuplet 3/2 { <cis a>8( <fis cis'>8 <cis a>8 } \tuplet 3/2 { <fis cis'>8 <cis a>8 <fis cis'>8 } |
  \tuplet 3/2 { <d a>8 <fis b>8 <d a>8 } \tuplet 3/2 { <fis b>8 <d a>8 <fis b>8) } |
  % 21-25
  \tuplet 3/2 { <cis a>8( <fis cis'>8 <cis a>8 } \tuplet 3/2 { <fis cis'>8 <cis a>8 <fis cis'>8 } |
  \tuplet 3/2 { <d a>8 <fis b>8 <d a>8 } \tuplet 3/2 { <fis b>8 <d a>8 <fis b>8) } |
  \tuplet 3/2 { <cis, cis>8 <cis a>8( <fis cis'>8 } \tuplet 3/2 { <cis a>8 <fis cis'>8 <cis a>8) } |
  \tuplet 3/2 { <b,, b,>8 <fis cis'>8( <a d'>8) } \tuplet 3/2 { <e, e>8 <e cis'>8( <gis d'>8) } |
  \tuplet 3/2 { <a,, a,>8 <e cis'>8( <a e'>8 } \tuplet 3/2 { <eis cis'>8 <gis eis'>8 <eis cis'>8) } |
  % 26-30
  \tuplet 3/2 { a,8( <fis cis'>8 fis'8) } \tuplet 3/2 { ais,8( fis8 cis'8) } |
  fis4 r4 |
  e,4.( eis,8) |
  \tuplet 6/4 { fis,8.( bis,16 cis16 fis16 } \tuplet 6/4 { eis16 gis16 fis16 eis16 fis16 cis16) } |
  <c, c>2( |
  % 31-35
  <b,, b,>8) r8 r4 |
  R2 |
  R2 |
  r4 <g b>4 |
  gis2 |
  % 36-40
  fis4( eis4) |
  \tuplet 3/2 { <fis, e ais>8 g8( eis8 } \tuplet 3/2 { fis8 ais8 d'8) } |
  R2 |
  R2 |
  R2 |
  % 41-45
  \tuplet 3/2 { <b fis'>8( <d' b'>8 <b fis'>8 } \tuplet 3/2 { <d' gis'>8 <b fis'>8 <d' ais'>8 } |
  \tuplet 3/2 { <b fis'>8 <d' b'>8 <b fis'>8 } \tuplet 3/2 { <d' a'>8 <b fis'>8 <d' a'>8) } |
  \tuplet 3/2 { <e d'>8( <b a'>8 <e d'>8 } \tuplet 3/2 { <b f'>8 <e d'>8 <b fis'>8 } |
  \tuplet 3/2 { <e d'>8 <b g'>8 <e d'>8 } \tuplet 3/2 { <b gis'>8 <e d'>8 <b b'>8) } |
  \tuplet 3/2 { <a e'>8( <c' a'>8 <a e'>8 } \tuplet 3/2 { <c' fis'>8 <a e'>8 <c' gis'>8 } |
  % 46-50
  \tuplet 3/2 { <a e'>8 <c' a'>8 <a e'>8 } \tuplet 3/2 { <c' g'>8 <a e'>8 <c' g'>8) } |
  \tuplet 3/2 { <d c'>8( <a g'>8 <d c'>8 } \tuplet 3/2 { <a ees'>8 <d c'>8 <a e'>8 } |
  \tuplet 3/2 { <d c'>8 <a f'>8 <d c'>8 } \tuplet 3/2 { <a fis'>8 <d c'>8 <a a'>8) } |
  \tuplet 3/2 { <g d'>8( <b a'>8 <g d'>8 } \tuplet 3/2 { <b e'>8 <g d'>8 <b fis'>8 } |
  \tuplet 3/2 { <g d'>8 <b g'>8 <g d'>8 } \tuplet 3/2 { <b b'>8 <g d'>8 <b b'>8) } |
  % 51-55
  \tuplet 3/2 { <f d'>8( <b a'>8 <f d'>8 } \tuplet 3/2 { <b a'>8 <f d'>8 <b a'>8 } |
  \tuplet 3/2 { <e d'>8 <b gis'>8 <e d'>8 } \tuplet 3/2 { <b gis'>8 <e d'>8 <b gis'>8) } |
  \tuplet 3/2 { <f d'>8( <b a'>8 <f d'>8 } \tuplet 3/2 { <b a'>8 <f d'>8 <b a'>8 } |
  \tuplet 3/2 { <e d'>8 <b gis'>8 <e d'>8 } \tuplet 3/2 { <b gis'>8 <e d'>8 <b gis'>8) } |
  \tuplet 3/2 { <eis d'>8( <b g'>8 <eis d'>8 } \tuplet 3/2 { <b g'>8 <eis d'>8 <b g'>8 } |
  % 56-60
  \tuplet 3/2 { <eis d'>8 <b g'>8 <eis d'>8 } \tuplet 3/2 { <b g'>8 <eis d'>8 <b g'>8) } |
  \tuplet 3/2 { <fis d'>8( <b fis'>8 <fis d'>8 } \tuplet 3/2 { <b fis'>8 <fis d'>8 <b fis'>8 } |
  \tuplet 3/2 { <g d'>8 <b e'>8 <g d'>8 } \tuplet 3/2 { <b e'>8 <g d'>8 <b e'>8) } |
  \tuplet 3/2 { <fis d'>8( <b fis'>8 <fis d'>8 } \tuplet 3/2 { <b fis'>8 <fis d'>8 <b fis'>8 } |
  \tuplet 3/2 { <g d'>8 <b e'>8 <g d'>8 } \tuplet 3/2 { <b e'>8 <g d'>8 <b e'>8) } |
  % 61-65
  \tuplet 3/2 { <fis, fis>8 <fis d'>8( <b fis'>8 } \tuplet 3/2 { <fis d'>8 <b fis'>8 <fis d'>8) } |
  \tuplet 3/2 { <e, e>8 <b fis'>8( <d' g'>8) } \tuplet 3/2 { <a, a>8 <a fis'>8( <cis' g'>8) } |
  \tuplet 3/2 { <d, d>8 <a fis'>8( <d' a'>8 } \tuplet 3/2 { <ais fis'>8 <cis' ais'>8 <ais fis'>8) } |
  \tuplet 3/2 { d8( <b fis'>8 b'8) } \tuplet 3/2 { dis8( b8 fis'8) } |
  b4 r4 |
  % 66-70
  a,4.( ais,8) |
  \tuplet 6/4 { b,8.( eis16 fis16 b16 } \tuplet 6/4 { ais16 cis'16 b16 ais16 b16 fis16) } |
  <f, f>2( |
  <e, e>8) r8 r4 |
  R2 |
  % 71-75
  R2 |
  r4 <c' e'>4 |
  cis'2 |
  b4( ais4) |
  \tuplet 6/4 { r8 b,,8( fis,8 d8 b,8 fis8 } |
  % 76-78
  \tuplet 6/4 { d'8 b8 fis'8 b'8 fis''8 d'''8 } |
  b'''8) r8 r4 |
  <b,, fis,>2\fermata |
}

lowerBassNotes = \absolute {
  % 1-5
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 6-10
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 11-15
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 16-20
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 21-25
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 26-30
  a,4 ais,4 |
  b,2 |
  s2 |
  s2 |
  s2 |
  % 31-35
  s2 |
  s2 |
  s2 |
  s1*1/4 b,4 |
  <cis b>2~ |
  % 36-40
  <cis b>2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 41-45
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 46-50
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 51-55
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 56-60
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 61-65
  s2 |
  s2 |
  s2 |
  d4 dis4 |
  e2 |
  % 66-70
  s2 |
  s2 |
  s2 |
  s2 |
  s2 |
  % 71-75
  s2 |
  s1*1/4 e4 |
  <fis e'>2~ |
  <fis e'>2 |
  s2 |
  % 76-78
  s2 |
  s2 |
  s2 |
}


dynamics = {
  \set Score.tempoHideNote = ##t
  % 1-5
  \tempo "Moderato" 4 = 70 s2\p |
  s2 |
  s2 |
  s2\< |
  s2\! |
  % 6-10
  s2 |
  s4\< s4\! |
  s4\> s4\! |
  s2\mf\> |
  s2\! |
  % 11-15
  s2\p |
  s4\< s4\! |
  s4\> s4\! |
  s2 |
  s4\< s4\! |
  % 16-20
  s4\> s4\! |
  s2\mf\> |
  s2\! |
  s4\< s4\! |
  s4\> s4\! |
  % 21-25
  s4\< s4\! |
  s4\> s4\! |
  s4\< s4\! |
  s4\> s4\! |
  s2\f\> |
  % 26-30
  s2\! |
  s2\< |
  s2\! |
  s2\mf |
  s4\> s4\! |
  % 31-35
  s2\p |
  s2 |
  s2 |
  s2 |
  s2\< |
  % 36-40
  s2\! |
  s2\sf |
  s2 |
  s2 |
  \tempo "rit." 4 = 50 s4\> s4\! |
  % 41-45
  \tempo "a tempo" 4 = 70 s2\p\< |
  s2\! |
  s2\> |
  s2\! |
  s2\< |
  % 46-50
  s2\! |
  s2\> |
  s2\! |
  s2\< |
  s2\! |
  % 51-55
  s4\< s4\! |
  s4\> s4\! |
  s4\< s4\! |
  s4\> s4\! |
  s4\< s4\! |
  % 56-60
  \tempo "rit." 4 = 50 s4\> s4\! |
  \tempo "a tempo" 4 = 70 s4\> s4\! |
  s4\> s4\! |
  s4\< s4\! |
  s4\> s4\! |
  % 61-65
  s2\< |
  s2 |
  s2\f\! |
  s2 |
  s2\< |
  % 66-70
  s2 |
  s2\mf\! |
  s4\> s4\! |
  s2\p |
  s2\> |
  % 71-75
  s2\! |
  s2 |
  s2\< |
  s2\! |
  s2\f\> |
  % 76-78
  s2 |
  s2\! |
  s2\p |
}

upper = <<
  \new Voice = "upperMelody" { \voiceOne \upperMelodyNotes }
  \new Voice = "upperInner" { \voiceTwo \upperInnerNotes }
>>

lower = <<
  \new Voice = "lowerArpeggios" { \voiceOne \lowerArpeggioNotes }
  \new Voice = "lowerBass" { \voiceTwo \lowerBassNotes }
>>

\score {
  \new PianoStaff <<
    \new Staff = "upper" { \clef treble \global \upper }
    \new Dynamics = "dynamics" \dynamics
    \new Staff = "lower" { \clef bass \global \lower }
  >>
  \layout { }
  \midi { }
}
