class Hammers {
    constructor(start_octave, end_octave, width, padding, hammer_height) {
        this.start_octave = start_octave || 0
        this.end_octave = end_octave || 10;
        this.width = width || 20;
        this.padding = end_octave || 4;
        this.hammer_height = hammer_height || 40;
        this.hammers = [];
        this.hammer_values = [];

        for (let i = this.start_octave; i < this.end_octave; i++) {
            for (let j = 0; j < 12; j++) {
                let note = i * 12 + j
                this.hammers[note] = false;
                this.hammer_values[note] = false;
            }
        }

        var canvas = document.createElement('canvas');
        canvas.width = this.width * (this.end_octave -  this.start_octave + 1) * 12;
        canvas.height = 60;
        this.canvas = canvas;

        document.body.appendChild(canvas);

        var ctx = canvas.getContext('2d');
        this.ctx = ctx;


    }

    paint() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        var baseline = 50;
        // const start_index = this.start_octave * 12;
        this.hammers.forEach((on, i) => {
            const x = i * this.width + this.padding / 2;

            let v = on ? this.hammer_height : this.hammer_values[i];
            const y = baseline - v;
            ctx.beginPath();
            ctx.moveTo(x, y)
            ctx.lineTo(x + this.width - this.padding / 2, y)
            ctx.stroke();

            if (!on) {
                v *= 0.85;
            }
            
            this.hammer_values[i] = v;
        })
    }

    toggleNote(note, on) {
        if (on == undefined) {
            this.hammers[note] = !this.hammers[note];
        }
        else {
            this.hammers[note] = on;
        }
    }

    // toggleNote(note) {
    //     const i = note - this.start_octave * 12;
    //     this.hammers[i] = this.hammer_height;
    // }
}