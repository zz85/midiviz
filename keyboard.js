// reused and modified from http://www.blurspline.com/labs/harpsichord/harpsichord2.html

var keyWidth = 25;
var keyHeight = 150;
var blacKeyWidth = 20;
var blackKeyHeight = 100;

var octaves = 8;

var keyboard = document.createElement('canvas');
document.body.appendChild(keyboard);

keyboard.width = 1600;
keyboard.height = 200;

var ctx = keyboard.getContext('2d');

ctx.save();
// ctx.scale(0.8, 0.8);
// ctx.translate(10, 10);

var blacks = [ 1, 3,     6, 8, 10];
var whites = [0, 2, 4, 5, 7, 9, 11];
var white_offsets = [0, 1, 3, 4, 5];

/*
1 << 1 | 1 << 3 | 1 << 6 | 1 << 8 | 1 << 10
=> 1354
=> (1354).toString(2)
=> 10101001010
[...Array(12).keys()].map(isBlack)

*/
function isBlack(pos) {
    return (1 << pos & 1354) !== 0
}

var piano_keys = {};



// Middle C = 60
// Low A = 21
// Low C = 24


function repaint() {
    ctx.clearRect(0, 0, keyboard.width, keyboard.height);
    
    for (var octave = 0; octave < octaves; octave++) {
        // draw white
        for (var key = 0; key < 7; key++) {
            var note = octave * 12 + whites[key];
            var played = piano_keys[note];
            
            drawWhiteNote(octave, key, played)
        }

        // draw black
        for (var key = 0; key < 5; key++) {
            var note = octave * 12 + blacks[key];
            var played = piano_keys[note];
            
            drawBlackNote(octave, white_offsets[key], played)
        }
    }
}

function drawWhiteNote(octave, i, played) {
    if (played) {
        ctx.fillStyle = 'red';
    }  else {
        ctx.fillStyle = 'white';
    }
    ctx.strokeRect( (octave * 7 + i) * keyWidth, 0, keyWidth, keyHeight);
    ctx.fillRect( (octave * 7 + i) * keyWidth, 0, keyWidth, keyHeight);
}

function drawBlackNote(octave, i, played) {
    if (played) {
        ctx.fillStyle = 'red';
    }  else {
        ctx.fillStyle = 'black';
    }

    var off = - blacKeyWidth/2;
    ctx.strokeRect( (octave * 7 + i) * keyWidth + off, 0, blacKeyWidth, blackKeyHeight);
    ctx.fillRect( (octave * 7 + i) * keyWidth + off, 0, blacKeyWidth, blackKeyHeight);
}

function toggleNote(note, value) {
    if (value === undefined) {
        piano_keys[note] = !piano_keys[note];
    }
    else {
        piano_keys[note] = value;
    }
}

class Keyboard {
    toggleNote(note, value) {
        toggleNote(note, value)
    }
}