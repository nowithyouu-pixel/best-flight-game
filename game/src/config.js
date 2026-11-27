// config.js — tuning constants for Kestrel Ridge. One place for every number
// the flight model, the world and the HUD agree on.
(function (global) {
  'use strict';

  var KestrelConfig = {
    // Flight model
    maxSpeed: 92,            // m/s at full throttle
    cruiseSpeed: 58,         // m/s the plane settles toward at 0.6 throttle
    minFlySpeed: 26,         // below this the wings stop flying (stall sink)
    maxBank: 1.05,           // radians of roll at full stick
    maxPitch: 0.42,          // radians of pitch at full stick
    turnRate: 0.55,          // heading change per second at full bank
    pitchRate: 1.6,          // how fast pitch chases the stick
    rollRate: 2.4,           // how fast roll chases the stick
    throttleRate: 0.55,      // throttle change per second
    climbPower: 0.9,         // vertical speed factor from pitch
    sinkRate: 6.5,           // m/s lost to gravity when slow
    stallSink: 14,           // extra sink below minFlySpeed
    drag: 0.12,              // speed decay toward throttle speed
    fuelBurn: 0.55,          // fuel units per second at full throttle
    fuelStart: 100,
    damageCrash: 100,

    // World
    terrainCell: 40,         // metres per terrain grid cell
    terrainRange: 720,       // metres of terrain drawn ahead
    terrainHalfWidth: 420,   // metres of terrain drawn to each side
    runwayX: 0,              // runway centreline (world x)
    runwayZ0: 0,             // runway start (world z)
    runwayZ1: 520,           // runway end
    runwayHalfWidth: 16,
    runwayHeight: 12,        // flat plateau height of the strip
    ringRadius: 15,
    ringCount: 8,

    // Camera
    camBehind: 26,           // metres behind the plane
    camAbove: 7.5,           // metres above the plane
    camAhead: 30,            // metres ahead the camera looks past the plane
    fov: 62,                 // vertical field of view, degrees

    // Missions
    ringScore: 250,
    checkpointScore: 150,
    landingScore: 500,
    timeBonusPerSecond: 5,

    // Colours (one dawn palette for sky, terrain and instruments)
    skyTop: '#2e4a7a',
    skyMid: '#7fa3c8',
    skyHorizon: '#f2c98a',
    sunColour: '#ffd9a0',
    grassLow: '#5d7a3a',
    grassHigh: '#7d9b4e',
    rockColour: '#8a7f74',
    sandColour: '#c9b078',
    waterColour: '#3f7fa8',
    runwayColour: '#4a4a50',
    ringColour: '#ff8c2e',
    ringNextColour: '#ffd23e',
    hudAmber: '#ffb347',
    hudGreen: '#7dff9a',
    hudRed: '#ff5a4e',
    hudCyan: '#7de3ff'
  };

  global.KestrelConfig = KestrelConfig;
})(typeof window !== 'undefined' ? window : globalThis);
