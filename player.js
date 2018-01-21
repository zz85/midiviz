/**
* Simple Generic Player
* 
*  properties
*  - lapse - running time
*  - playing - is playing
*  - start - goal post
*  - speed - running speed
* 
*  methods
*  - play() - resume playing when stopped/paused
*  - stop() - stops and reset time to 0
*  - pause() - pauses playing
*  - speed() - adjust speed
*  - seek() - seeks to time
*/
const player = {
    init() {
        this.stop()
    },

    play() {
        if (!playing) {
            playing = true
            // create reference point
            this._adjust()
        }
    },

    stop() {
        playing = false
        start = null 
        lapse = 0 // in seconds
        speed = 1
        // TODO emit events
    },

    speed(target) {
        speed = +target
        this._adjust()
    },

    _adjust() {
        // adjust playing reference point
        start = this.now() - lapse * 1 / speed * 1000
    },

    pause() {
        if (playing) {
            playing = false
        }
        else {
            this.play()
        }
    },

    seek(target) {
        lapse = target
        this._adjust()
    },

    update() {
        // use start time as reference time
        if (playing) {
            lapse = (this.now() - start) * speed / 1000
        }
    },

    now() {
        return (window.performance || Date).now()
    }
}