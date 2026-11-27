// audio.js — engine and wind, synthesized live with WebAudio. No sound
// files: two detuned oscillators for the prop and filtered noise for the
// slipstream, both following throttle and speed. Silent until the pilot
// first touches a control, as browsers require.
(function (global) {
  'use strict';

  function createAudio() {
    var ctx = null;
    var engineOsc1 = null;
    var engineOsc2 = null;
    var engineGain = null;
    var windGain = null;
    var windFilter = null;
    var muted = false;
    var started = false;

    function ensure() {
      if (started) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
      } catch (e) {
        return;
      }
      started = true;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineGain.connect(ctx.destination);
      engineOsc1 = ctx.createOscillator();
      engineOsc1.type = 'sawtooth';
      engineOsc1.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 82;
      var osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.4;
      engineOsc1.connect(engineGain);
      engineOsc2.connect(osc2Gain);
      osc2Gain.connect(engineGain);
      engineOsc1.start();
      engineOsc2.start();
      // Wind: looped white noise through a low-pass filter.
      var len = ctx.sampleRate * 2;
      var buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 400;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
    }

    function update(plane, flying) {
      if (!started || !ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      var target = muted || !flying ? 0 : 0.05 + plane.throttle * 0.11;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      var freq = 42 + plane.throttle * 48 + plane.speed * 0.25;
      engineOsc1.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1);
      engineOsc2.frequency.setTargetAtTime(freq * 1.5 + 3, ctx.currentTime, 0.1);
      var windTarget = muted || !flying ? 0 : Math.min(0.16, plane.speed * 0.0016);
      windGain.gain.setTargetAtTime(windTarget, ctx.currentTime, 0.2);
      windFilter.frequency.setTargetAtTime(300 + plane.speed * 9, ctx.currentTime, 0.2);
    }

    // A short two-note chime when a ring or checkpoint is hit.
    function chime() {
      if (!started || !ctx || muted) return;
      var t = ctx.currentTime;
      [660, 990].forEach(function (f, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.22, t + i * 0.09 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.4);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t + i * 0.09);
        o.stop(t + i * 0.09 + 0.45);
      });
    }

    return {
      ensure: ensure,
      update: update,
      chime: chime,
      setMuted: function (m) { muted = m; },
      isMuted: function () { return muted; }
    };
  }

  global.KestrelAudio = { createAudio: createAudio };
})(typeof window !== 'undefined' ? window : globalThis);
