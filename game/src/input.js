// input.js — keyboard and mouse. The stick is the arrow keys or WASD, the
// mouse steers toward the pointer, the wheel works the throttle. Every
// frame the game reads one merged control state from here.
(function (global) {
  'use strict';

  var clamp = global.KestrelPlane.clamp;

  function createInput(canvas) {
    var keys = {};
    var mouse = { x: 0.5, y: 0.5, active: false, left: false, right: false };
    var wheelDelta = 0;
    var state = {
      pitch: 0, roll: 0, throttle: 0, brake: false,
      pause: false, mute: false, restart: false,
      mission: 0, start: false
    };

    function onKeyDown(e) {
      if (e.repeat) return;
      keys[e.code] = true;
      if (e.code === 'KeyP') state.pause = !state.pause;
      if (e.code === 'KeyM') state.mute = !state.mute;
      if (e.code === 'KeyR') state.restart = true;
      if (e.code === 'Enter' || e.code === 'Space') state.start = true;
      if (e.code === 'Digit1') state.mission = 1;
      if (e.code === 'Digit2') state.mission = 2;
      if (e.code === 'Digit3') state.mission = 3;
      if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    }

    function onKeyUp(e) {
      keys[e.code] = false;
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / Math.max(1, r.width);
      mouse.y = (e.clientY - r.top) / Math.max(1, r.height);
      mouse.active = true;
    }

    function onMouseDown(e) {
      if (e.button === 0) mouse.left = true;
      if (e.button === 2) mouse.right = true;
      state.start = true;
      e.preventDefault();
    }

    function onMouseUp(e) {
      if (e.button === 0) mouse.left = false;
      if (e.button === 2) mouse.right = false;
    }

    function onWheel(e) {
      wheelDelta += e.deltaY < 0 ? 1 : -1;
      e.preventDefault();
    }

    function onBlur() {
      for (var k in keys) keys[k] = false;
      mouse.left = false;
      mouse.right = false;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('blur', onBlur);

    // Merge keyboard and mouse into one control state for this frame.
    function poll() {
      var pitch = 0;
      var roll = 0;
      var throttle = 0;
      if (keys.ArrowUp || keys.KeyW) pitch += 1;
      if (keys.ArrowDown || keys.KeyS) pitch -= 1;
      if (keys.ArrowLeft || keys.KeyA) roll -= 1;
      if (keys.ArrowRight || keys.KeyD) roll += 1;
      if (keys.ShiftLeft || keys.ShiftRight) throttle += 1;
      if (keys.ControlLeft || keys.ControlRight) throttle -= 1;
      if (mouse.active) {
        // The pointer steers: left/right banks, up/down pitches.
        var mx = clamp((mouse.x - 0.5) * 2.4, -1, 1);
        var my = clamp((mouse.y - 0.5) * 2.4, -1, 1);
        if (Math.abs(mx) > 0.08) roll = clamp(roll + mx, -1, 1);
        if (Math.abs(my) > 0.08) pitch = clamp(pitch - my, -1, 1);
      }
      if (mouse.left) throttle += 1;
      if (mouse.right) throttle -= 1;
      throttle += wheelDelta * 0.6;
      wheelDelta = 0;
      state.pitch = clamp(pitch, -1, 1);
      state.roll = clamp(roll, -1, 1);
      state.throttle = clamp(throttle, -1, 1);
      state.brake = !!(keys.KeyB || keys.Space);
      return state;
    }

    // One-shot flags the game loop consumes (then clears).
    function consumeFlags() {
      var f = {
        pause: state.pause, mute: state.mute,
        restart: state.restart, mission: state.mission, start: state.start
      };
      state.pause = false;
      state.restart = false;
      state.mission = 0;
      state.start = false;
      return f;
    }

    return { poll: poll, consumeFlags: consumeFlags };
  }

  global.KestrelInput = { createInput: createInput };
})(typeof window !== 'undefined' ? window : globalThis);
