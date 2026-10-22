% Liszt: Album-Leaf "Berlin Preludio", S. 164g (Berlin, 3 March 1842)
% Transcribed for midiviz from the edition by Aidan Modica (2021, from the
% manuscript; IMSLP #710207, CC0 1.0). The whole piece is two bars: seven
% rolled diminished-seventh chords in contrary motion (precipitato), then a
% cadence in C. Bar 2's right hand is under an 8va line, written here at
% sounding pitch. Rolls are added by the build script. CC0.
% Compiled to midis/liszt_s164g_berlin_preludio.mid by midis/tools/build_shorts.mjs.
\version "2.24.0"
\header { title = "Berlin Preludio" composer = "Franz Liszt" opus = "S. 164g" }

rh = \absolute {
  \time 4/4 \tempo 4 = 72
  r8\f <ais' e'' g'' cis'''>8 <b' f'' gis'' d'''> <c'' fis'' a'' ees'''>
    <cis'' g'' bes'' e'''> <d'' gis'' b'' f'''> <ees'' a'' c''' fis'''> <e'' bes'' cis''' g'''> |
  <f'' b'' d''' aes'''>8\ff r <f'' b'' g'''> r <c''' g''' e''''>4 r4 \bar "|."
}

lh = \absolute {
  \time 4/4
  r8\f <e ais cis' g'>8 <d gis b f'> <c fis a ees'>
    <bes, e g cis'> <gis, d f b> <fis, c ees a> <e, bes, cis g> |
  <d, aes, b, f>8\ff r <g, d f b> r <c, g, e>4 r4 \bar "|."
}

\score {
  \new PianoStaff <<
    \new Staff = "upper" \rh
    \new Staff = "lower" { \clef bass \lh }
  >>
  \layout { }
  \midi { }
}
