#!/bin/sh
# Run Audiveris (5.11) on the prepared pages: ./omr.sh <work> [first last]
# AUDIVERIS is the command that starts it (default: audiveris). Writes, for each page,
# cache/<work>/omr/<page>.omr (its book, which extract.py reads the measure geometry from)
# and cache/<work>/omr/x/<page>/<page>.xml (MusicXML).
set -e
cd "$(dirname "$0")"
W=$1; C=${TRANSCRIBE_CACHE:-$PWD/cache}/$W/omr
A=${AUDIVERIS:-audiveris}
[ -d "$C" ] || { echo "no $C: run prep.py first" >&2; exit 1; }
for f in "$C"/p*.png; do
  p=$(basename "$f" .png); n=${p#p}; n=$(expr "$n" + 0)
  [ -n "$2" ] && { [ "$n" -lt "$2" ] || [ "$n" -gt "$3" ]; } && continue
  [ -f "$C/x/$p/$p.xml" ] && continue
  $A -batch -export -output "$C" "$f" > "$C/$p.log" 2>&1 || echo "$p: audiveris failed, see $C/$p.log" >&2
  mkdir -p "$C/x/$p" && unzip -o -q "$C/$p.mxl" -d "$C/x/$p"
  echo "$p"
done
