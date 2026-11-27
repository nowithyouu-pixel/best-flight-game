// shots.js — deterministic states for the screenshots (?shot=...). Each
// preset parks the plane, the mission and the camera at a composed moment
// and freezes the simulation, so the render is the same every load. This
// is the game's own code rendering its own frames; nothing is composited.
(function (global) {
  'use strict';

  var C = global.KestrelConfig;
  var T = global.KestrelTerrain;

  // Returns { plane, missionId, state, frozen } or null for a normal game.
  function shotPreset(name) {
    var P = global.KestrelPlane;
    var M = global.KestrelMissions;
    if (name === 'menu') {
      var parked = P.createPlane();
      parked.z = 60;
      var mission = M.createMission(1);
      return { plane: parked, mission: mission, state: 'menu', frozen: true, missionIndex: 0 };
    }
    if (name === 'cover') {
      var flying = P.createPlane();
      flying.x = T.valleyCentre(750) - 14;
      flying.y = 58;
      flying.z = 750;
      flying.heading = 0.06;
      flying.pitch = 0.04;
      flying.roll = 0.22;
      flying.speed = 64;
      flying.throttle = 0.72;
      flying.airborne = true;
      flying.onGround = false;
      var ringMission = M.createMission(1);
      ringMission.rings[0].passed = true;
      ringMission.ringsHit = 1;
      ringMission.score = C.ringScore;
      ringMission.time = 41;
      return { plane: flying, mission: ringMission, state: 'flying', frozen: true, missionIndex: 0 };
    }
    if (name === 'landing') {
      var approach = P.createPlane();
      approach.x = 4;
      approach.y = 24;
      approach.z = -130;
      approach.heading = 0;
      approach.pitch = -0.06;
      approach.roll = 0;
      approach.speed = 44;
      approach.throttle = 0.35;
      approach.gearDown = true;
      approach.flaps = true;
      approach.airborne = true;
      approach.onGround = false;
      var delivery = M.createMission(2);
      delivery.checkpoints.forEach(function (c) { c.passed = true; });
      delivery.checkpointsHit = 3;
      delivery.score = 3 * C.checkpointScore;
      delivery.time = 128;
      M.setMessage(delivery, 'FINAL APPROACH — RUNWAY AHEAD');
      return { plane: approach, mission: delivery, state: 'flying', frozen: true, missionIndex: 1 };
    }
    if (name === 'rings') {
      var banking = P.createPlane();
      banking.x = T.valleyCentre(1400) + 6;
      banking.y = 58;
      banking.z = 1400;
      banking.heading = -0.12;
      banking.pitch = 0.08;
      banking.roll = 0.62;
      banking.speed = 71;
      banking.throttle = 0.85;
      banking.airborne = true;
      banking.onGround = false;
      var chase = M.createMission(1);
      chase.rings[0].passed = true;
      chase.rings[1].passed = true;
      chase.rings[2].passed = true;
      chase.ringsHit = 3;
      chase.score = 3 * C.ringScore;
      chase.time = 96;
      M.setMessage(chase, 'RING 3 / 8  +250');
      return { plane: banking, mission: chase, state: 'flying', frozen: true, missionIndex: 0 };
    }
    return null;
  }

  global.KestrelShots = { shotPreset: shotPreset };
})(typeof window !== 'undefined' ? window : globalThis);
