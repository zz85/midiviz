// node --test strings/test/score.test.js   (MuseScore .mscx / .mscz input, strings/score.js)
// The full check against MuseScore's own MusicXML exports is strings/test/mscz.js (OpenScore corpus).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { readMSCX, readMSCZ, readMusicXML, readScoreFile } from '../score.js'

// MuseScore 3: 3/4 at 120 (tempo is quarters per second), two parts; a slur over A B C#
// (named by its end, 3/8 later), D staccato with an up-bow, E tied over the bar,
// a triplet and a glissando into the last note
const MS3 = `<?xml version="1.0" encoding="UTF-8"?>
<museScore version="3.02"><Score><Division>480</Division>
<metaTag name="workTitle">Little Piece</metaTag>
<Part><Staff id="1"/><trackName>Violin 1</trackName><Instrument><longName>Violin</longName></Instrument></Part>
<Part><Staff id="2"/><trackName>Viola</trackName><Instrument><longName>Viola</longName></Instrument></Part>
<Staff id="1">
 <Measure><voice>
  <TimeSig><sigN>3</sigN><sigD>4</sigD></TimeSig>
  <Tempo><tempo>2</tempo><text>♩ = 120</text></Tempo>
  <Dynamic><subtype>f</subtype><velocity>96</velocity></Dynamic>
  <Chord><durationType>eighth</durationType>
   <Spanner type="Slur"><Slur/><next><location><fractions>1/4</fractions></location></next></Spanner>
   <Note><pitch>69</pitch><tpc>17</tpc></Note></Chord>
  <Chord><durationType>eighth</durationType><Note><pitch>71</pitch><tpc>19</tpc></Note></Chord>
  <Chord><durationType>eighth</durationType>
   <Spanner type="Slur"><prev><location><fractions>-1/4</fractions></location></prev></Spanner>
   <Note><pitch>73</pitch><tpc>21</tpc></Note></Chord>
  <Chord><durationType>eighth</durationType>
   <Articulation><subtype>articStaccatoAbove</subtype></Articulation>
   <Articulation><subtype>stringsUpBow</subtype></Articulation>
   <Note><pitch>74</pitch><tpc>16</tpc></Note></Chord>
  <Chord><durationType>quarter</durationType>
   <Note><Spanner type="Tie"><Tie/><next><location><fractions>1/4</fractions></location></next></Spanner><pitch>76</pitch><tpc>18</tpc></Note></Chord>
 </voice></Measure>
 <Measure><voice>
  <Chord><durationType>quarter</durationType>
   <Note><Spanner type="Tie"><prev><location><fractions>-1/4</fractions></location></prev></Spanner><pitch>76</pitch><tpc>18</tpc></Note></Chord>
  <Tuplet><normalNotes>2</normalNotes><actualNotes>3</actualNotes><baseNote>eighth</baseNote></Tuplet>
  <Chord><durationType>eighth</durationType><Note><pitch>74</pitch><tpc>16</tpc></Note></Chord>
  <Chord><durationType>eighth</durationType><Note><pitch>73</pitch><tpc>21</tpc></Note></Chord>
  <Chord><durationType>eighth</durationType>
   <Note><pitch>71</pitch><tpc>19</tpc><Spanner type="Glissando"><Glissando/><next><location><fractions>1/12</fractions></location></next></Spanner></Note></Chord>
  <endTuplet/>
  <Chord><acciaccatura/><durationType>eighth</durationType><Note><pitch>78</pitch><tpc>20</tpc></Note></Chord>
  <Chord><durationType>quarter</durationType>
   <Articulation><subtype>articAccentAbove</subtype></Articulation>
   <Note><pitch>81</pitch><tpc>17</tpc><Spanner type="Glissando"><prev><location><fractions>-1/12</fractions></location></prev></Spanner></Note></Chord>
 </voice></Measure>
</Staff>
<Staff id="2">
 <Measure><voice><TimeSig><sigN>3</sigN><sigD>4</sigD></TimeSig><Rest><durationType>measure</durationType><duration>3/4</duration></Rest></voice></Measure>
 <Measure><voice><Chord><durationType>half</durationType><dots>1</dots><Note><pitch>60</pitch><tpc>14</tpc></Note></Chord></voice></Measure>
</Staff>
</Score></museScore>`

// the same first bar as MusicXML, as MuseScore exports it
const MXML = `<?xml version="1.0"?><score-partwise><work><work-title>Little Piece</work-title></work>
<part-list><score-part id="P1"><part-name>Violin 1</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
<direction><sound tempo="120"/></direction>
<note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><notations><slur type="start" number="1"/></notations></note>
<note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
<note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>1</duration><voice>1</voice><notations><slur type="stop" number="1"/></notations></note>
<note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><notations><articulations><staccato/></articulations><technical><up-bow/></technical></notations></note>
<note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><tie type="start"/></note>
</measure><measure number="2">
<note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><tie type="stop"/></note>
</measure></part></score-partwise>`

test('MuseScore 3 .mscx: times, tuplets, ties, slurs from their end, marks, bowings, grace notes skipped, glissando, parts, dynamics', () => {
  const s = readMSCX(MS3)
  assert.equal(s.title, 'Little Piece')
  assert.deepEqual(s.parts.map(p => p.name), ['Violin 1', 'Viola'])
  assert.equal(s.part, 0)
  assert.deepEqual(s.notes.map(n => n.pitch), [69, 71, 73, 74, 76, 74, 73, 71, 81])
  // 120 quarters / min: an eighth is 0.25 s; triplet eighths 1/6 s
  assert.deepEqual(s.notes.map(n => +n.on.toFixed(3)), [0, 0.25, 0.5, 0.75, 1, 2, 2.167, 2.333, 2.5])
  assert.equal(+(s.notes[4].off - s.notes[4].on).toFixed(3), 1, 'the tie is one note of two quarters')
  assert.equal(+(s.notes[3].off - s.notes[3].on).toFixed(3), 0.125, 'staccato sounds half its value')
  const [a, b, c, d] = s.notes
  assert.ok(a.art.slur != null && a.art.slur === b.art.slur && b.art.slur === c.art.slur && d.art.slur == null)
  assert.equal(d.art.stroke, 'staccato'); assert.equal(d.art.bow, 'up')
  assert.equal(s.notes[8].art.stroke, 'accent'); assert.equal(s.notes[8].art.port, true, 'glissando into it')
  assert.ok(Math.abs(a.velocity - 96 / 127) < 1e-6 && s.notes[8].velocity > a.velocity, 'dynamic velocity, accents louder')
  assert.deepEqual(s.notes.map(n => n.measure), [1, 1, 1, 1, 1, 2, 2, 2, 2])
  assert.deepEqual(s.meter.map(m => [m.beats, m.beatType]), [[3, 4]])
  // the viola part
  const v = readMSCX(MS3, { part: 1 })
  assert.deepEqual(v.notes.map(n => [n.pitch, n.on, n.off]), [[60, 1.5, 3]])
  // the first bar matches the MusicXML reader on the same music
  const x = readMusicXML(MXML)
  const pick = n => [n.pitch, +n.on.toFixed(4), +n.off.toFixed(4), n.art.stroke, n.art.bow, n.art.slur != null, n.beat]
  assert.deepEqual(s.notes.slice(0, 5).map(pick), x.notes.map(pick))
})

// a minimal zip writer (deflate), for the .mscz test
function zip(files) {
  const enc = new TextEncoder(), parts = [], dir = []
  let off = 0
  for (const [name, text] of Object.entries(files)) {
    const nm = enc.encode(name), raw = enc.encode(text), data = deflateRawSync(raw)
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(nm.length, 26)
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42)
    parts.push(h, nm, data); dir.push(c, nm); off += 30 + nm.length + data.length
  }
  const cd = Buffer.concat(dir), e = Buffer.alloc(22)
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(dir.length / 2, 8); e.writeUInt16LE(dir.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16)
  const b = Buffer.concat([...parts, cd, e])
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.length)
}

test('MuseScore 4 .mscz: the root score (not an excerpt), implicit staff ids (4.6), a tempo after a change, 8va-free sounding pitches', async () => {
  // 4.6 drops the staff ids; "a tempo" carries a placeholder tempo of 2 (120)
  const ms4 = MS3.replace('version="3.02"', 'version="4.60"').replace(/<Staff id="(\d)"\/>/g, '<Staff><eid>x</eid></Staff>').replace(/<Staff id="(\d)">/g, '<Staff>')
    .replace('<Chord><durationType>quarter</durationType>\n   <Articulation><subtype>articAccentAbove', '<Tempo><tempo>2</tempo><type>aTempo</type><text>a tempo</text></Tempo><Chord><durationType>quarter</durationType>\n   <Articulation><subtype>articAccentAbove')
    .replace('<Tempo><tempo>2</tempo><text>♩ = 120</text></Tempo>', '<Tempo><tempo>1</tempo><text>♩ = 60</text></Tempo>')
  const buf = zip({
    'META-INF/container.xml': '<container><rootfiles><rootfile full-path="score.mscx"/><rootfile full-path="Excerpts/Viola/Viola.mscx"/></rootfiles></container>',
    'Excerpts/Viola/Viola.mscx': '<museScore version="4.60"><Score><Part><Staff/><trackName>Viola</trackName></Part><Staff><Measure><voice><Chord><durationType>whole</durationType><Note><pitch>48</pitch></Note></Chord></voice></Measure></Staff></Score></museScore>',
    'score.mscx': ms4,
  })
  const s = readMSCZ(buf, b => inflateRawSync(b))
  assert.deepEqual(s.parts.map(p => p.name), ['Violin 1', 'Viola'])
  assert.deepEqual(s.notes.map(n => n.pitch), [69, 71, 73, 74, 76, 74, 73, 71, 81])
  // 60 bpm: eighths are 0.5 s; "a tempo" keeps 60 (the last marked tempo)
  assert.deepEqual(s.notes.map(n => +n.on.toFixed(3)), [0, 0.5, 1, 1.5, 2, 4, 4.333, 4.667, 5])
  assert.deepEqual(s.tempo.map(t => t.bpm), [60, 60])
  assert.equal(readMSCX(ms4, { part: 1 }).notes[0].pitch, 60)
  // by name, as the page opens files
  const r = await readScoreFile('piece.mscz', buf, { inflateRaw: b => inflateRawSync(b), part: 1 })
  assert.equal(r.part, 1); assert.equal(r.notes[0].pitch, 60)
  assert.throws(() => readMSCX('<museScore version="2.06"><Score/></museScore>'), /MuseScore 2.06/)
})

test('MusicXML: a part without tempo marks takes the top part\'s (MuseScore writes them there only)', () => {
  const two = MXML.replace('<score-part id="P1"><part-name>Violin 1</part-name></score-part>', '<score-part id="P1"><part-name>Violin 1</part-name></score-part><score-part id="P2"><part-name>Viola</part-name></score-part>')
    .replace('</part></score-partwise>', `</part><part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
<note><rest/><duration>3</duration></note></measure><measure number="2"><note><pitch><step>C</step><octave>4</octave></pitch><duration>3</duration></note></measure></part></score-partwise>`)
  const v = readMusicXML(two, { part: 1 })
  assert.equal(v.part, 1)
  assert.deepEqual(v.notes.map(n => [n.pitch, n.on, n.off]), [[60, 1.5, 3]], '120 bpm from the violin part, not the 100 default')
})
