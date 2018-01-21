// reused and modified from http://www.blurspline.com/labs/harpsichord/harpsichord2.html


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


// Middle C = 60
// Low A = 21
// Low C = 24

var keyWidth = 25;
var keyHeight = 150;
var blacKeyWidth = 20;
var blackKeyHeight = 100;

var HIGHLIGHT_NOTE = 'yellow' // red

function drawWhiteNote(ctx, octave, i, played) {
    if (played) {
        ctx.fillStyle = HIGHLIGHT_NOTE;
    }  else {
        ctx.fillStyle = 'white';
    }
    ctx.strokeRect((octave * 7 + i) * keyWidth, 0, keyWidth, keyHeight);
    ctx.fillRect((octave * 7 + i) * keyWidth, 0, keyWidth, keyHeight);
}

function drawBlackNote(ctx, octave, i, played) {
    if (played) {
        ctx.fillStyle = HIGHLIGHT_NOTE;
    }  else {
        ctx.fillStyle = 'black';
    }

    var off = blacKeyWidth/2;
    ctx.strokeRect((octave * 7 + i) * keyWidth + off, 0, blacKeyWidth, blackKeyHeight);
    ctx.fillRect((octave * 7 + i) * keyWidth + off, 0, blacKeyWidth, blackKeyHeight);
}

class Keyboard {
    constructor(octave_start, octave_end) {
        this.piano_keys = {};
        this.octave_start = octave_start || 0
        this.octave_end = octave_end || 8;

        var keyboard = document.createElement('canvas');
        document.body.appendChild(keyboard);

        keyboard.width = keyWidth * (this.octave_end - this.octave_start + 1) * 7;
        keyboard.height = 200;

        var ctx = keyboard.getContext('2d');

        ctx.save();
        ctx.scale(0.5, 0.5);
        this.ctx = ctx;
    }

    paint() {
        // magic values
        var octaves = 8;

        var blacks = [ 1, 3,     6, 8, 10];
        var whites = [0, 2, 4, 5, 7, 9, 11];
        var white_offsets = [0, 1, 3, 4, 5];

        var piano_keys = this.piano_keys
        var ctx = this.ctx;

        ctx.clearRect(0, 0, keyboard.width, keyboard.height);

        var octave_start = this.octave_start
        var octave_end = this.octave_end
        
        for (var octave = octave_start; octave < octave_end; octave++) {
            // draw white
            for (var key = 0; key < 7; key++) {
                var note = octave * 12 + whites[key];
                var played = piano_keys[note];
                
                drawWhiteNote(ctx, octave - octave_start, key, played)
            }
    
            // draw black
            for (var key = 0; key < 5; key++) {
                var note = octave * 12 + blacks[key];
                var played = piano_keys[note];
                
                drawBlackNote(ctx, octave - octave_start, white_offsets[key], played)
            }
        }
    }

    toggleNote(note, value) {
        if (value === undefined) {
            this.piano_keys[note] = !this.piano_keys[note];
        }
        else {
            this.piano_keys[note] = value;
        }
    }
}