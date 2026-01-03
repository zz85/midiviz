// AudioWorklet processor that receives samples from main thread
class OxiSynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferQueue = [];
    this.currentBuffer = null;
    this.bufferIndex = 0;
    
    this.port.onmessage = (e) => {
      if (e.data.samples) {
        this.bufferQueue.push(e.data.samples);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    
    const left = output[0];
    const right = output[1] || left;
    
    for (let i = 0; i < left.length; i++) {
      // Get next buffer if needed
      if (!this.currentBuffer || this.bufferIndex >= this.currentBuffer.length / 2) {
        this.currentBuffer = this.bufferQueue.shift();
        this.bufferIndex = 0;
        
        // Request more buffers when running low
        if (this.bufferQueue.length < 2) {
          this.port.postMessage({ needBuffers: true });
        }
      }
      
      if (this.currentBuffer) {
        left[i] = this.currentBuffer[this.bufferIndex * 2];
        right[i] = this.currentBuffer[this.bufferIndex * 2 + 1];
        this.bufferIndex++;
      } else {
        left[i] = 0;
        right[i] = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('oxisynth-processor', OxiSynthProcessor);
