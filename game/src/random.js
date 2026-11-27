// random.js — small seeded random number generator and value noise, so the
// ridge, the river and the tree line are the same on every run.
(function (global) {
  'use strict';

  // mulberry32: a tiny deterministic PRNG.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash of an integer lattice point, stable for any (x, z) pair.
  function latticeHash(ix, iz, seed) {
    var h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) % 100000) / 100000;
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  // Two-dimensional value noise in [0, 1].
  function valueNoise(x, z, seed) {
    var ix = Math.floor(x);
    var iz = Math.floor(z);
    var fx = x - ix;
    var fz = z - iz;
    var a = latticeHash(ix, iz, seed);
    var b = latticeHash(ix + 1, iz, seed);
    var c = latticeHash(ix, iz + 1, seed);
    var d = latticeHash(ix + 1, iz + 1, seed);
    var ux = smooth(fx);
    var uz = smooth(fz);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  // Fractal noise: three octaves of value noise, still in roughly [0, 1].
  function fbm(x, z, seed) {
    var v = 0;
    var amp = 0.55;
    var freq = 1;
    for (var i = 0; i < 3; i++) {
      v += valueNoise(x * freq, z * freq, seed + i * 101) * amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return v;
  }

  global.KestrelRandom = {
    mulberry32: mulberry32,
    valueNoise: valueNoise,
    fbm: fbm
  };
})(typeof window !== 'undefined' ? window : globalThis);
