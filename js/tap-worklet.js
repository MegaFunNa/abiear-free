(() => {
  // js/tap-worklet.js
  var TapProcessor = class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.buf = new Float32Array(1024);
      this.pos = 0;
    }
    process(inputs) {
      const input = inputs[0] ?? [];
      const chans = input.length, n = chans ? input[0].length : 128;
      {
        for (let i = 0; i < n; i++) {
          let s = 0;
          for (let c = 0; c < chans; c++) s += input[c][i];
          this.buf[this.pos++] = chans ? s / chans : 0;
          if (this.pos === this.buf.length) {
            this.port.postMessage(this.buf);
            this.buf = new Float32Array(1024);
            this.pos = 0;
          }
        }
      }
      return true;
    }
  };
  registerProcessor("tap", TapProcessor);
})();
