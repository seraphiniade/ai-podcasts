// 2026 Trend: AudioWorklet for isolated audio processing thread
class AnalogWarmthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.drive = 1.2; // Slight overdrive for warmth
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) return true;

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      for (let i = 0; i < inputChannel.length; ++i) {
        // Soft clipping / analog warmth effect
        const x = inputChannel[i] * this.drive;
        // Approximation of tanh for soft clipping
        outputChannel[i] = (2 / Math.PI) * Math.atan(x);
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('analog-warmth-processor', AnalogWarmthProcessor);
