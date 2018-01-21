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
        canvas.width = 400; 
        canvas.height = 400;
        this.canvas = canvas;

        document.body.appendChild(canvas);

        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#999'
        this.ctx = ctx;


    }

    paint() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        var baseline = 50;
        // const start_index = this.start_octave * 12;

        var total_width = this.hammer_values.length * this.width;
        this.hammers.forEach((on, i) => {
            const x = i * this.width + this.padding / 2;

            let v = this.hammer_values[i];

            if (on) {
                v += (this.hammer_height - this.hammer_values[i]) * 0.25
            } else {
                v *= 0.85;
            }

            const y = baseline - v;
           
            const x2 = x + this.width - this.padding / 2;
            // ctx.moveTo(x, y)
            // ctx.lineTo(x2, y)

            // Inside
            // ctx.beginPath();
            // ctx.arc(200, 200, y, x / total_width * Math.PI * 2, x2 / total_width * Math.PI * 2);
            // ctx.stroke();

            // Outside
            // ctx.beginPath();
            // ctx.arc(200, 200, 80 + v, (x / total_width) * Math.PI * 2, (x2 / total_width) * Math.PI * 2);
            // ctx.stroke();

            var ca = (x * 0.5 + x2 * 0.5) / total_width * Math.PI * 2
            var cx = Math.cos(ca) * (100 + v * 2);
            var cy = Math.sin(ca) * (100 + v * 2);
            
            ctx.fillStyle = '#' + ((x * 0.5 + x2 * 0.5) / total_width * 0xffffff | 0).toString(16)
            ctx.beginPath();
            ctx.arc(cx + 200, cy + 200, 3, 0, Math.PI * 2, false);
            ctx.fill();

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