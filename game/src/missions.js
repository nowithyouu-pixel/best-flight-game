// missions.js — the three sorties: ring run, ridge delivery, free flight.
// A mission tracks its own targets, score and clock; the game loop only
// asks it what to show and what the plane just achieved.
(function (global) {
  'use strict';

  var C = global.KestrelConfig;
  var T = global.KestrelTerrain;

  var MISSIONS = [
    {
      id: 1,
      name: 'Ring Run',
      brief: 'Thread all 8 dawn rings down the valley, then land on the strip.',
      targets: 'rings'
    },
    {
      id: 2,
      name: 'Ridge Delivery',
      brief: 'Pass 3 checkpoints over the ridge, then put her down on the runway.',
      targets: 'checkpoints'
    },
    {
      id: 3,
      name: 'Free Flight',
      brief: 'No course, no clock. Fly the valley, watch the fuel, land when ready.',
      targets: 'none'
    }
  ];

  function createMission(id) {
    var def = MISSIONS[id - 1] || MISSIONS[0];
    return {
      id: def.id,
      name: def.name,
      brief: def.brief,
      rings: def.targets === 'rings' ? T.ringPositions() : [],
      checkpoints: def.targets === 'checkpoints' ? T.checkpointPositions() : [],
      score: 0,
      time: 0,
      ringsHit: 0,
      checkpointsHit: 0,
      finished: false,
      message: '',
      messageTime: 0
    };
  }

  function nextTarget(m) {
    var list = m.rings.length ? m.rings : m.checkpoints;
    for (var i = 0; i < list.length; i++) {
      if (!list[i].passed) return list[i];
    }
    return null;
  }

  function targetsDone(m) {
    return nextTarget(m) === null && (m.rings.length > 0 || m.checkpoints.length > 0);
  }

  function setMessage(m, text) {
    m.message = text;
    m.messageTime = 3.2;
  }

  // Called every frame while flying. Returns an event string or ''.
  function updateMission(m, plane, dt) {
    if (m.finished) return '';
    m.time += dt;
    if (m.messageTime > 0) m.messageTime -= dt;
    var target = nextTarget(m);
    if (!target) return '';
    var dx = plane.x - target.x;
    var dy = plane.y - target.y;
    var dz = plane.z - target.z;
    // Rings and checkpoints count when the plane crosses their plane close in.
    var radial = Math.sqrt(dx * dx + dy * dy);
    if (Math.abs(dz) < 14 && radial < C.ringRadius + 4) {
      target.passed = true;
      if (m.rings.length) {
        m.ringsHit++;
        m.score += C.ringScore;
        setMessage(m, 'RING ' + m.ringsHit + ' / ' + m.rings.length + '  +' + C.ringScore);
      } else {
        m.checkpointsHit++;
        m.score += C.checkpointScore;
        setMessage(m, 'CHECKPOINT ' + m.checkpointsHit + ' / ' + m.checkpoints.length + '  +' + C.checkpointScore);
      }
      if (targetsDone(m)) {
        setMessage(m, 'COURSE CLEAR — BRING HER HOME TO THE RUNWAY');
        return 'course-clear';
      }
      return 'target-hit';
    }
    return '';
  }

  // Called when the plane touches down. Returns the landing bonus earned.
  function scoreLanding(m, plane) {
    if (m.finished) return 0;
    var bonus = C.landingScore;
    if (targetsDone(m)) bonus += 400;
    var timeBonus = 0;
    if (m.rings.length || m.checkpoints.length) {
      timeBonus = Math.max(0, Math.round(600 - m.time) * C.timeBonusPerSecond);
    }
    m.score += bonus + timeBonus;
    m.finished = true;
    setMessage(m, 'TOUCHDOWN  +' + bonus + (timeBonus ? '  TIME BONUS +' + timeBonus : ''));
    return bonus + timeBonus;
  }

  function missionSummary(m) {
    var lines = [];
    lines.push('SCORE ' + m.score);
    lines.push('TIME ' + Math.floor(m.time / 60) + ':' + String(Math.floor(m.time % 60)).padStart(2, '0'));
    if (m.rings.length) lines.push('RINGS ' + m.ringsHit + '/' + m.rings.length);
    if (m.checkpoints.length) lines.push('CHECKPOINTS ' + m.checkpointsHit + '/' + m.checkpoints.length);
    return lines;
  }

  global.KestrelMissions = {
    MISSIONS: MISSIONS,
    createMission: createMission,
    nextTarget: nextTarget,
    targetsDone: targetsDone,
    setMessage: setMessage,
    updateMission: updateMission,
    scoreLanding: scoreLanding,
    missionSummary: missionSummary
  };
})(typeof window !== 'undefined' ? window : globalThis);
