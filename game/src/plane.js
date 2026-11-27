// plane.js — the Kestrel's flight model: throttle, pitch, roll, speed,
// fuel and damage. Arcade-simple on purpose: the stick always answers,
// and the numbers are what the HUD reads.
(function (global) {
  'use strict';

  var C = global.KestrelConfig;
  var T = global.KestrelTerrain;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function createPlane() {
    return {
      x: 0, y: C.runwayHeight + 1.6, z: 40,
      heading: 0,          // 0 = north (+z), grows clockwise
      pitch: 0,            // nose up positive
      roll: 0,             // right wing down positive
      speed: 0,
      throttle: 0,
      fuel: C.fuelStart,
      damage: 0,
      verticalSpeed: 0,
      gearDown: true,
      flaps: false,
      airborne: false,
      crashed: false,
      landed: false,
      onGround: true
    };
  }

  // One physics step. input: { pitch: -1..1, roll: -1..1, throttle: -1..1,
  // brake: bool }. dt in seconds. Returns an event string or ''.
  function stepPlane(p, input, dt) {
    if (p.crashed || p.landed) return '';

    // Throttle: stick up / W raises it, stick down / S lowers it.
    p.throttle = clamp(p.throttle + input.throttle * C.throttleRate * dt, 0, 1);
    if (input.brake) p.throttle = clamp(p.throttle - 0.9 * dt, 0, 1);

    // Attitude chases the stick, with the plane's own inertia.
    var targetPitch = input.pitch * C.maxPitch * (p.onGround ? 0.35 : 1);
    var targetRoll = input.roll * C.maxBank;
    p.pitch += clamp(targetPitch - p.pitch, -C.pitchRate * dt, C.pitchRate * dt);
    p.roll += clamp(targetRoll - p.roll, -C.rollRate * dt, C.rollRate * dt);

    // Heading follows the bank; a banked plane turns.
    var turnAuthority = clamp(p.speed / C.cruiseSpeed, 0.15, 1);
    p.heading += Math.sin(p.roll) * C.turnRate * turnAuthority * dt;

    // Speed settles toward what the throttle can hold.
    var targetSpeed = p.throttle * C.maxSpeed;
    if (p.flaps) targetSpeed *= 0.72;
    p.speed += (targetSpeed - p.speed) * Math.min(1, C.drag * 2.4 * dt + 0.35 * dt);
    if (p.onGround && p.speed < 4) p.speed = Math.max(p.speed, 0);

    // Lift and sink: pitch trades speed for height, slow wings sink.
    var lift = Math.sin(p.pitch) * p.speed * C.climbPower;
    var sink = C.sinkRate * (1 - clamp(p.speed / C.cruiseSpeed, 0, 1));
    if (p.speed < C.minFlySpeed) sink += C.stallSink * (1 - p.speed / C.minFlySpeed);
    if (p.onGround) sink = 0;
    p.verticalSpeed = lift - sink;

    // Move along the nose.
    var fx = Math.sin(p.heading);
    var fz = Math.cos(p.heading);
    p.x += fx * p.speed * Math.cos(p.pitch) * dt;
    p.z += fz * p.speed * Math.cos(p.pitch) * dt;
    p.y += p.verticalSpeed * dt;

    // Fuel burns with throttle; an empty tank glides.
    if (p.fuel > 0) {
      p.fuel = Math.max(0, p.fuel - C.fuelBurn * (0.25 + p.throttle) * dt);
      if (p.fuel === 0) p.throttle = Math.max(p.throttle - 0.5 * dt, 0);
    }

    // Ground contact.
    var ground = T.groundHeight(p.x, p.z);
    if (p.y <= ground + 1.6) {
      p.y = ground + 1.6;
      return touchDown(p, ground);
    }
    p.onGround = false;
    if (p.y > ground + 12) p.airborne = true;
    return '';
  }

  function touchDown(p, ground) {
    var wasAirborne = p.airborne;
    p.onGround = true;
    var vertical = Math.abs(p.verticalSpeed);
    if (!wasAirborne) {
      // Still rolling on the strip: taking off needs speed.
      if (p.speed > C.minFlySpeed && p.pitch > 0.12) {
        p.onGround = false;
        p.airborne = true;
        p.y = ground + 2.2;
      }
      return '';
    }
    // Coming back down: a landing or a crash.
    var onStrip = T.isRunway(p.x, p.z);
    var gentle = vertical < 4.5 && p.speed < 46 && Math.abs(p.roll) < 0.35;
    if (onStrip && gentle) {
      p.landed = true;
      p.speed *= 0.55;
      return 'landed';
    }
    if (onStrip && vertical < 8 && p.speed < 60) {
      // Hard landing on the strip: the airframe takes it, barely.
      p.damage += 34;
      p.speed *= 0.4;
      p.airborne = false;
      if (p.damage >= C.damageCrash) {
        p.crashed = true;
        return 'crashed';
      }
      return 'hard-landing';
    }
    p.crashed = true;
    return 'crashed';
  }

  function resetPlane(p) {
    var fresh = createPlane();
    for (var k in fresh) p[k] = fresh[k];
  }

  global.KestrelPlane = {
    createPlane: createPlane,
    stepPlane: stepPlane,
    resetPlane: resetPlane,
    clamp: clamp
  };
})(typeof window !== 'undefined' ? window : globalThis);
