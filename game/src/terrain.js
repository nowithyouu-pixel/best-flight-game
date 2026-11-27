// terrain.js — the ridge itself: a winding valley, a river, a runway strip
// and the ring course. Everything is a pure function of (x, z), so the
// physics, the renderer and the screenshots always agree about the ground.
(function (global) {
  'use strict';

  var C = global.KestrelConfig;
  var R = global.KestrelRandom;

  // The valley floor wanders east and west as you fly north.
  function valleyCentre(z) {
    return 62 * Math.sin(z * 0.004) + 28 * Math.sin(z * 0.0013 + 1.2);
  }

  // The river wanders on the other side of the valley.
  function riverCentre(z) {
    return -58 * Math.sin(z * 0.0031 + 1.7) - 24 * Math.sin(z * 0.0011 + 0.4);
  }

  // Raw rolling hills, before the valley, river and runway are carved in.
  function hillHeight(x, z) {
    var n = R.fbm(x * 0.004 + 7.3, z * 0.004 + 2.9, 11);
    var ridge = R.fbm(x * 0.0016 + 1.1, z * 0.0016 + 8.8, 23);
    var h = n * 46 + ridge * ridge * 95;
    // Far side walls rise so the valley reads as a valley.
    var d = Math.abs(x - valleyCentre(z));
    h += Math.max(0, d - 150) * 0.55;
    return h;
  }

  // Height of the ground at (x, z), in metres.
  function groundHeight(x, z) {
    var h = hillHeight(x, z);
    var vc = valleyCentre(z);
    var dValley = Math.abs(x - vc);
    // Flatten the valley floor.
    var valleyFloor = 9 + R.fbm(x * 0.01, z * 0.01, 31) * 4;
    var t = Math.min(1, Math.max(0, (dValley - 55) / 130));
    h = valleyFloor + (h - valleyFloor) * t * t * (3 - 2 * t);
    // Carve the river bed.
    var dRiver = Math.abs(x - riverCentre(z));
    if (dRiver < 26) {
      var carve = (1 - dRiver / 26);
      h -= carve * carve * 7;
    }
    // The runway is a flat concrete plateau.
    if (z >= C.runwayZ0 - 20 && z <= C.runwayZ1 + 20 &&
        Math.abs(x - C.runwayX) < C.runwayHalfWidth + 14) {
      var ex = Math.min(1, Math.max(0, (Math.abs(x - C.runwayX) - C.runwayHalfWidth) / 14));
      var ez = 0;
      if (z < C.runwayZ0) ez = (C.runwayZ0 - z) / 20;
      if (z > C.runwayZ1) ez = (z - C.runwayZ1) / 20;
      var e = Math.max(ex, ez);
      var s = e * e * (3 - 2 * e);
      h = C.runwayHeight + (h - C.runwayHeight) * s;
    }
    return h;
  }

  function isRiver(x, z) {
    return Math.abs(x - riverCentre(z)) < 13 &&
      groundHeight(x, z) < 9.5;
  }

  function isRunway(x, z) {
    return z >= C.runwayZ0 && z <= C.runwayZ1 &&
      Math.abs(x - C.runwayX) <= C.runwayHalfWidth;
  }

  // The ring course follows the valley north from the runway.
  function ringPositions() {
    var rings = [];
    var rng = R.mulberry32(20261126);
    for (var i = 0; i < C.ringCount; i++) {
      var z = 620 + i * 260;
      var x = valleyCentre(z) + (rng() - 0.5) * 70;
      var y = 42 + rng() * 55 + i * 2;
      rings.push({ x: x, y: y, z: z, index: i, passed: false });
    }
    return rings;
  }

  // Checkpoint flags for the delivery sortie.
  function checkpointPositions() {
    return [
      { x: valleyCentre(900), y: 70, z: 900, index: 0, passed: false },
      { x: valleyCentre(1500), y: 95, z: 1500, index: 1, passed: false },
      { x: valleyCentre(2100), y: 60, z: 2100, index: 2, passed: false }
    ];
  }

  // Trees grow on the valley shoulders, never on the runway or in the river.
  // They are keyed by terrain cell so the renderer can draw each tree right
  // after the ground quad it stands on (correct occlusion, no sorting pass).
  function treesForCell(cx, cz) {
    var list = [];
    var cell = C.terrainCell;
    var seed = (cx * 73856093) ^ (cz * 19349663);
    var rng = R.mulberry32(seed >>> 0);
    if (rng() > 0.62) return list;
    var n = 1 + Math.floor(rng() * 2);
    for (var i = 0; i < n; i++) {
      var x = cx * cell + rng() * cell;
      var z = cz * cell + rng() * cell;
      if (isRunway(x, z) || isRiver(x, z)) continue;
      var dValley = Math.abs(x - valleyCentre(z));
      if (dValley < 45) continue;
      var h = groundHeight(x, z);
      if (h > 95) continue;
      list.push({ x: x, y: h, z: z, size: 7 + rng() * 9, kind: rng() < 0.7 ? 0 : 1 });
    }
    return list;
  }

  // A dozen clouds hang over the valley, fixed for every flight.
  function cloudPositions() {
    var rng = R.mulberry32(77);
    var clouds = [];
    for (var i = 0; i < 12; i++) {
      clouds.push({
        x: (rng() - 0.5) * 1600,
        y: 170 + rng() * 90,
        z: 200 + rng() * 2400,
        r: 60 + rng() * 90
      });
    }
    return clouds;
  }

  global.KestrelTerrain = {
    valleyCentre: valleyCentre,
    riverCentre: riverCentre,
    groundHeight: groundHeight,
    isRiver: isRiver,
    isRunway: isRunway,
    ringPositions: ringPositions,
    checkpointPositions: checkpointPositions,
    treesForCell: treesForCell,
    cloudPositions: cloudPositions
  };
})(typeof window !== 'undefined' ? window : globalThis);
