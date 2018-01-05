// simple web audio synthesizer
// @blurspline

// Instrument synthesis code based on http://www.iquilezles.org/

var skipLow = -36
function noteOn(note, vol) {
	// console.log(note, vol);
	if (note) play(note, vol)
}

/***
 * Web Audio Synth
 */

var AC = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;

if (!AC) {
	console.log('Web Audio API not found');
}

var audioContext = new AC();

var sampleRate = 44100;
var bufferLength = 1 * sampleRate; // 1 second

var buffer;
var samples;

// Number of cache notes
var notes = 12 * 10; // octaves
var noteSamples = new Array(notes);

var buffers = 16;
var currentBuffer = 0;
var playbackBuffers = new Array(buffers);

var i;
var sin = Math.sin;
var cos = Math.cos;
var exp = Math.exp;

function func(w,num,buf, isr) { // sound function
	for(var i=0; i<num; i++ ) {
		var t = i*isr;
		var y = 0.0;
		// Audio Synth Code here
		// Modified from iq (2006) - http://www.iquilezles.org/apps/soundtoy/?p=Piano%202
		y = 0.2 * sin(0.25 * w * t) * exp(-40 * t);
		y += 0.5 * sin(0.5 * w * t) * exp(-10 * t);
		y += 0.9*sin(1.0*w*t)*exp(-0.0008*w*t);
		y += 0.3*sin(2.0*w*t)*exp(-0.0010*w*t);
		y += 0.1*sin(4.0*w*t)*exp(-0.0015*w*t);
		y += 0.2*y*y*y;
		y *= 0.9 + 0.1*cos(170.0*t);		
		buf[i] = y;
	}
}


function generateSample(note, outputBuffer) {
	var semitones = note - 69; // Semitones from A440 (Midi no 69)
	var frequency = 440.0 * Math.pow( 2.0, semitones / 12.0 );
	var wavelength = Math.PI * 2 * frequency;
	var isr = 1.0 / sampleRate; // inverse sample rate

	func(wavelength, bufferLength, outputBuffer, isr);
}


// A0 - 21, C1 - 24, C2 - 36
console.time('generate')
for (i=0; i<notes; i++) {
	samples = new Float32Array(bufferLength);
    generateSample(i + 12, samples);
	noteSamples[i] = samples;
}

console.timeEnd('generate')

var current = 0;

// Caching samples for all notes
for (i=0; i<buffers;i++) {
	buffer = audioContext.createBuffer(1, bufferLength, sampleRate);
	playbackBuffers[i] = buffer;
}

var vol = 100;

var gainNode = audioContext.createGain();
	gainNode.connect(audioContext.destination);
	// gainNode.gain.value = 0.5 * vol / 100.0;

function play(k, vol) {
    currentBuffer = ++currentBuffer % 8;;
    
    if (vol !== undefined) gainNode.gain.setTargetAtTime(vol, 0, 0)

	if (k>noteSamples.length || k < 0) {
		console.log('out of range', k);
		return;
	}

	var destinationBuffer = playbackBuffers[currentBuffer].getChannelData(0);
	var num = bufferLength;
	var sourceBuffer = noteSamples[k];
	for( i=0; i<bufferLength; i++) {
	    destinationBuffer[i] = sourceBuffer[i];
	}

	var node = audioContext.createBufferSource();
	    node.buffer = playbackBuffers[currentBuffer];
	    node.connect(gainNode);
	    node.start(0);
}

// if (RANDOM_DURATIONS) PlayLoop();
// else setInterval(PlayLoop, 400);