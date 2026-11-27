// main.js — the game loop and the state machine: menu, flying, paused,
// landed, crashed. Wires input, physics, missions, audio and the renderer
// together, and exposes a small status handle for play-testing.
(function (global) {
  'use strict';

  var P = global.KestrelPlane;
  var M = global.KestrelMissions;
  var R = global.KestrelRender;
  var T = global.KestrelTerrain;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('status');
  var input = global.KestrelInput.createInput(canvas);
  var audio = global.KestrelAudio.createAudio();
  var clouds = T.cloudPositions();

  var params = new URLSearchParams(window.location.search);
  var preset = global.KestrelShots.shotPreset(params.get('shot') || '');

  var plane;
  var mission;
  var state;
  var missionIndex = 0;
  var frozen = false;
  var time = 0;
  var frames = 0;
  var lastStatus = 0;

  if (preset) {
    plane = preset.plane;
    mission = preset.mission;
    state = preset.state;
    missionIndex = preset.missionIndex;
    frozen = preset.frozen;
  } else {
    plane = P.createPlane();
    mission = M.createMission(1);
    state = 'menu';
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function startMission(id) {
    missionIndex = id - 1;
    P.resetPlane(plane);
    mission = M.createMission(id);
    state = 'flying';
    audio.ensure();
  }

  function restart() {
    P.resetPlane(plane);
    mission = M.createMission(missionIndex + 1);
    state = 'menu';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
    frame.last = now;
    if (!frozen) time += dt;
    resize();
    var flags = input.consumeFlags();
    var controls = input.poll();

    if (flags.mute) audio.setMuted(!audio.isMuted());
    if (flags.restart && state !== 'menu') restart();
    if (flags.mission) missionIndex = flags.mission - 1;

    if (state === 'menu') {
      if (flags.start) startMission(missionIndex + 1);
    } else if (state === 'flying') {
      if (flags.pause) {
        state = 'paused';
      } else {
        var event = P.stepPlane(plane, controls, dt);
        var mevent = M.updateMission(mission, plane, dt);
        if (mevent === 'target-hit' || mevent === 'course-clear') audio.chime();
        if (event === 'landed') {
          M.scoreLanding(mission, plane);
          state = 'landed';
        } else if (event === 'crashed') {
          state = 'crashed';
        } else if (event === 'hard-landing') {
          M.setMessage(mission, 'HARD LANDING — HULL ' + Math.round(plane.damage) + '%');
        }
        if (plane.fuel <= 0 && plane.airborne && plane.verticalSpeed < -2) {
          M.setMessage(mission, 'OUT OF FUEL — FIND THE RUNWAY');
        }
        audio.update(plane, true);
      }
    } else if (state === 'paused') {
      if (flags.pause || flags.start) state = 'flying';
      audio.update(plane, false);
    } else if (state === 'landed' || state === 'crashed') {
      if (flags.restart) restart();
      audio.update(plane, false);
    }

    R.renderFrame(ctx, canvas.width, canvas.height, plane, mission, state, missionIndex, clouds, time);
    frames++;
    if (now - lastStatus > 500) {
      lastStatus = now;
      statusEl.textContent = 'state=' + state +
        ' alt=' + Math.round(plane.y) +
        ' spd=' + Math.round(plane.speed) +
        ' fuel=' + Math.round(plane.fuel) +
        ' score=' + mission.score +
        ' fps=' + Math.round(frames / Math.max(1, time));
      window.__kestrel = {
        state: state,
        alt: Math.round(plane.y),
        speed: Math.round(plane.speed),
        fuel: Math.round(plane.fuel),
        score: mission.score,
        frames: frames
      };
    }
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})(typeof window !== 'undefined' ? window : globalThis);
