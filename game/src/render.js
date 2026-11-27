// render.js — the whole picture: a dawn sky, a software-projected ridge,
// the Kestrel in frame, and instruments that glow. Pure Canvas 2D, no
// images, no network: every pixel is drawn from numbers in this file.
(function (global) {
  'use strict';

  var C = global.KestrelConfig;
  var T = global.KestrelTerrain;
  var clamp = global.KestrelPlane.clamp;

  function hexRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }

  function mix(a, b, t) {
    return 'rgb(' +
      Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  var SKY_TOP = hexRgb(C.skyTop);
  var SKY_MID = hexRgb(C.skyMid);
  var SKY_HOR = hexRgb(C.skyHorizon);
  var GRASS_LOW = hexRgb(C.grassLow);
  var GRASS_HIGH = hexRgb(C.grassHigh);
  var ROCK = hexRgb(C.rockColour);
  var SAND = hexRgb(C.sandColour);
  var WATER = hexRgb(C.waterColour);
  var RUNWAY = hexRgb(C.runwayColour);

  // A tiny 3D camera: world point -> screen point, or null when behind us.
  function makeCamera(plane, width, height) {
    var fx = Math.sin(plane.heading);
    var fz = Math.cos(plane.heading);
    var fwd = { x: fx, y: Math.sin(plane.pitch) * 0.55, z: fz };
    var fl = Math.sqrt(fwd.x * fwd.x + fwd.y * fwd.y + fwd.z * fwd.z);
    fwd.x /= fl; fwd.y /= fl; fwd.z /= fl;
    var right = { x: fz, y: 0, z: -fx };
    // up = fwd x right (right-handed: forward, right, up).
    var up = {
      x: fwd.y * right.z - fwd.z * right.y,
      y: fwd.z * right.x - fwd.x * right.z,
      z: fwd.x * right.y - fwd.y * right.x
    };
    var eye = {
      x: plane.x - fx * C.camBehind,
      y: plane.y + C.camAbove,
      z: plane.z - fz * C.camBehind
    };
    var focal = (height / 2) / Math.tan((C.fov / 2) * Math.PI / 180);
    var cx = width / 2;
    var cy = height * 0.52;
    return {
      eye: eye, fwd: fwd, right: right, up: up,
      focal: focal, cx: cx, cy: cy,
      project: function (x, y, z) {
        var dx = x - eye.x;
        var dy = y - eye.y;
        var dz = z - eye.z;
        var depth = dx * fwd.x + dy * fwd.y + dz * fwd.z;
        if (depth < -2) return null;
        if (depth < 0.5) {
          // Near clip: push the point out to the near plane along the
          // view direction instead of dropping the quad, so the ground
          // fills the bottom of the frame.
          var push = 0.5 - depth;
          dx += fwd.x * push;
          dy += fwd.y * push;
          dz += fwd.z * push;
          depth = 0.5;
        }
        var rx = dx * right.x + dy * right.y + dz * right.z;
        var uy = dx * up.x + dy * up.y + dz * up.z;
        return {
          x: cx + (rx * focal) / depth,
          y: cy - (uy * focal) / depth,
          depth: depth
        };
      }
    };
  }

  function drawSky(ctx, width, height, plane) {
    var g = ctx.createLinearGradient(0, 0, 0, height * 0.62);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.55, C.skyMid);
    g.addColorStop(1, C.skyHorizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height * 0.62 + 2);
    // Low sun, upper right, with a soft halo.
    var sx = width * 0.78;
    var sy = height * 0.16;
    var halo = ctx.createRadialGradient(sx, sy, 4, sx, sy, 150);
    halo.addColorStop(0, 'rgba(255, 217, 160, 0.95)');
    halo.addColorStop(0.25, 'rgba(255, 190, 120, 0.55)');
    halo.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sx - 160, sy - 160, 320, 320);
    ctx.fillStyle = C.sunColour;
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCloud(ctx, cam, cloud) {
    var p = cam.project(cloud.x, cloud.y, cloud.z);
    if (!p) return;
    var s = (cloud.r * cam.focal) / p.depth;
    if (s < 4) return;
    ctx.fillStyle = 'rgba(255, 244, 230, 0.75)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x - s * 0.5, p.y + s * 0.06, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + s * 0.55, p.y + s * 0.05, s * 0.55, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function groundColour(x, z, h, depth, maxDepth) {
    var c;
    if (T.isRunway(x, z)) {
      c = RUNWAY;
    } else if (T.isRiver(x, z)) {
      c = WATER;
    } else if (h > 88) {
      c = ROCK;
    } else if (h < 12) {
      var sand = clamp((12 - h) / 6, 0, 1) * 0.6;
      c = [GRASS_LOW[0] + (SAND[0] - GRASS_LOW[0]) * sand,
           GRASS_LOW[1] + (SAND[1] - GRASS_LOW[1]) * sand,
           GRASS_LOW[2] + (SAND[2] - GRASS_LOW[2]) * sand];
    } else {
      var t = clamp((h - 12) / 76, 0, 1);
      c = [GRASS_LOW[0] + (GRASS_HIGH[0] - GRASS_LOW[0]) * t,
           GRASS_LOW[1] + (GRASS_HIGH[1] - GRASS_LOW[1]) * t,
           GRASS_LOW[2] + (GRASS_HIGH[2] - GRASS_LOW[2]) * t];
    }
    // Distance haze melts the far ridge into the dawn.
    var haze = clamp((depth - 140) / (maxDepth - 140), 0, 0.72);
    return mix(c, SKY_HOR, haze);
  }

  function drawTerrain(ctx, cam, plane, width, height) {
    var cell = C.terrainCell;
    var ex = cam.eye.x;
    var ez = cam.eye.z;
    var fx = Math.sin(plane.heading);
    var fz = Math.cos(plane.heading);
    var rows = Math.ceil(C.terrainRange / cell);
    var halfCols = Math.ceil(C.terrainHalfWidth / cell);
    // Projected grid, far row first so near quads paint over far ones.
    var grid = [];
    for (var r = rows; r >= 0; r--) {
      var zc = ez + fz * r * cell;
      var xc = ex + fx * r * cell;
      var row = [];
      for (var ci = -halfCols; ci <= halfCols; ci++) {
        var x = xc - fz * ci * cell;
        var z = zc + fx * ci * cell;
        var h = T.groundHeight(x, z);
        row.push({ p: cam.project(x, h, z), x: x, z: z, h: h });
      }
      grid.push(row);
    }
    for (var gi = 0; gi < grid.length - 1; gi++) {
      var a = grid[gi];
      var b = grid[gi + 1];
      for (var i = 0; i < a.length - 1; i++) {
        var p00 = a[i].p, p01 = a[i + 1].p, p10 = b[i].p, p11 = b[i + 1].p;
        if (!p00 || !p01 || !p10 || !p11) continue;
        var depth = (p00.depth + p01.depth + p10.depth + p11.depth) / 4;
        var mx = (a[i].x + a[i + 1].x + b[i].x + b[i + 1].x) / 4;
        var mz = (a[i].z + a[i + 1].z + b[i].z + b[i + 1].z) / 4;
        var mh = (a[i].h + a[i + 1].h + b[i].h + b[i + 1].h) / 4;
        ctx.fillStyle = groundColour(mx, mz, mh, depth, C.terrainRange);
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.closePath();
        ctx.fill();
        // Runway centreline dashes and edge lights.
        if (T.isRunway(mx, mz)) {
          var dash = Math.floor(mz / 24) % 2 === 0;
          if (dash && Math.abs(mx - C.runwayX) < 3) {
            ctx.fillStyle = 'rgba(255, 255, 240, 0.85)';
            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y);
            ctx.lineTo(p01.x, p01.y);
            ctx.lineTo(p11.x, p11.y);
            ctx.lineTo(p10.x, p10.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      // Trees of this row's cells, drawn with the ground they stand on.
      var rowZ = a[0].z;
      var czCell = Math.floor(rowZ / cell);
      for (var tx = -halfCols; tx <= halfCols; tx++) {
        var cxCell = Math.floor((a[Math.max(0, tx + halfCols)] || a[0]).x / cell);
        var trees = T.treesForCell(cxCell, czCell);
        for (var ti = 0; ti < trees.length; ti++) drawTree(ctx, cam, trees[ti]);
      }
    }
  }

  function drawTree(ctx, cam, tree) {
    var base = cam.project(tree.x, tree.y, tree.z);
    if (!base || base.depth < 55) return;
    var s = (tree.size * cam.focal) / base.depth;
    if (s < 2) return;
    s = Math.min(s, 130);
    var top = cam.project(tree.x, tree.y + tree.size * 2.4, tree.z);
    if (!top) return;
    var trunkW = Math.max(1, s * 0.14);
    ctx.fillStyle = '#5a3d24';
    ctx.fillRect(base.x - trunkW / 2, top.y + s * 1.1, trunkW, base.y - (top.y + s * 1.1));
    ctx.fillStyle = tree.kind === 0 ? '#2f5d2a' : '#3a6b35';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x - s * 0.75, top.y + s * 1.5);
    ctx.lineTo(top.x + s * 0.75, top.y + s * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tree.kind === 0 ? '#3a7031' : '#4a7d3f';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - s * 0.35);
    ctx.lineTo(top.x - s * 0.55, top.y + s * 0.9);
    ctx.lineTo(top.x + s * 0.55, top.y + s * 0.9);
    ctx.closePath();
    ctx.fill();
  }

  function drawRing(ctx, cam, ring, isNext, time) {
    var centre = cam.project(ring.x, ring.y, ring.z);
    if (!centre) return;
    var pts = [];
    for (var i = 0; i <= 18; i++) {
      var a = (i / 18) * Math.PI * 2;
      var px = ring.x + Math.cos(a) * C.ringRadius;
      var py = ring.y + Math.sin(a) * C.ringRadius;
      var p = cam.project(px, py, ring.z);
      if (p) pts.push(p);
    }
    if (pts.length < 4) return;
    var pulse = isNext ? 0.75 + 0.25 * Math.sin(time * 5) : 0.55;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = ring.passed ? '#8dff9a' : (isNext ? C.ringNextColour : C.ringColour);
    ctx.lineWidth = Math.max(2, (900 / centre.depth) * 1.6);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // The Kestrel herself, drawn rear-on in the lower centre of the frame,
  // banking with the roll and pitching with the climb.
  function drawPlane(ctx, width, height, plane, time) {
    var cx = width / 2;
    var cy = height * 0.66;
    var scale = Math.min(width, height) / 700;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-plane.roll * 0.9);
    ctx.translate(0, -plane.pitch * 90 * scale);
    ctx.scale(scale, scale);
    // Propeller blur.
    ctx.fillStyle = 'rgba(220, 230, 240, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, -58, 26, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings.
    ctx.fillStyle = '#c8442c';
    ctx.beginPath();
    ctx.moveTo(-150, -6);
    ctx.quadraticCurveTo(-120, -22, -18, -12);
    ctx.lineTo(-14, 4);
    ctx.lineTo(-120, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(150, -6);
    ctx.quadraticCurveTo(120, -22, 18, -12);
    ctx.lineTo(14, 4);
    ctx.lineTo(120, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e2d4';
    ctx.fillRect(-150, -4, 26, 5);
    ctx.fillRect(124, -4, 26, 5);
    // Fuselage.
    var body = ctx.createLinearGradient(-16, 0, 16, 0);
    body.addColorStop(0, '#8a2f1e');
    body.addColorStop(0.5, '#d9503a');
    body.addColorStop(1, '#8a2f1e');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -72);
    ctx.quadraticCurveTo(15, -52, 14, -18);
    ctx.quadraticCurveTo(13, 22, 8, 52);
    ctx.lineTo(-8, 52);
    ctx.quadraticCurveTo(-13, 22, -14, -18);
    ctx.quadraticCurveTo(-15, -52, 0, -72);
    ctx.closePath();
    ctx.fill();
    // Canopy, lit from the dawn.
    var glass = ctx.createLinearGradient(0, -58, 0, -18);
    glass.addColorStop(0, '#bfe6ff');
    glass.addColorStop(1, '#5a8fb5');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(0, -38, 9, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail.
    ctx.fillStyle = '#c8442c';
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.lineTo(-26, 62);
    ctx.lineTo(-20, 68);
    ctx.lineTo(0, 56);
    ctx.lineTo(20, 68);
    ctx.lineTo(26, 62);
    ctx.closePath();
    ctx.fill();
    // Nav lights: red left, green right, white tail — they blink.
    var blink = (Math.floor(time * 1.4) % 2) === 0;
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath(); ctx.arc(-150, -2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#35e05a';
    ctx.beginPath(); ctx.arc(150, -2, 4, 0, Math.PI * 2); ctx.fill();
    if (blink) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 66, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // --- HUD ---------------------------------------------------------------

  function litText(ctx, text, x, y, font, colour, align) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colour;
    ctx.shadowBlur = 8;
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawHud(ctx, width, height, plane, mission, state) {
    var altFt = Math.round((plane.y - T.groundHeight(plane.x, plane.z)) * 3.281 + 40);
    var spdKt = Math.round(plane.speed * 1.944);
    var hdg = ((Math.round(plane.heading * 180 / Math.PI) % 360) + 360) % 360;

    // Top bar.
    ctx.fillStyle = 'rgba(10, 16, 28, 0.55)';
    ctx.fillRect(0, 0, width, 54);
    litText(ctx, 'ALT ' + altFt + ' FT', 18, 18, 'bold 20px monospace', C.hudAmber);
    litText(ctx, 'SPD ' + spdKt + ' KT', 18, 42, 'bold 20px monospace', C.hudGreen);
    litText(ctx, 'HDG ' + String(hdg).padStart(3, '0') + '°', width / 2, 18, 'bold 20px monospace', C.hudCyan, 'center');
    // Compass tape.
    ctx.save();
    ctx.beginPath();
    ctx.rect(width / 2 - 130, 30, 260, 18);
    ctx.clip();
    for (var d = -60; d <= 60; d += 15) {
      var deg = ((hdg + d) % 360 + 360) % 360;
      var x = width / 2 + d * 2.1;
      ctx.strokeStyle = 'rgba(125, 227, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x, d % 45 === 0 ? 46 : 40);
      ctx.stroke();
      if (d % 45 === 0) litText(ctx, String(deg).padStart(3, '0'), x, 42, '10px monospace', C.hudCyan, 'center');
    }
    ctx.restore();

    // Right column: fuel, damage, score, mission.
    var rx = width - 190;
    litText(ctx, mission.name.toUpperCase(), rx, 18, 'bold 15px monospace', C.hudAmber);
    litText(ctx, 'SCORE ' + mission.score, rx, 40, 'bold 15px monospace', '#ffffff');
    drawBar(ctx, rx, 58, 170, 10, plane.fuel / 100, plane.fuel > 25 ? C.hudGreen : C.hudRed, 'FUEL');
    drawBar(ctx, rx, 80, 170, 10, 1 - plane.damage / 100, plane.damage < 60 ? C.hudGreen : C.hudRed, 'HULL');
    litText(ctx, 'THR ' + Math.round(plane.throttle * 100) + '%', rx, 104, 'bold 14px monospace', C.hudCyan);

    // Artificial horizon, bottom centre-left.
    drawArtificialHorizon(ctx, 92, height - 92, 62, plane);
    // Throttle bar, bottom right.
    drawBar(ctx, width - 190, height - 40, 170, 10, plane.throttle, C.hudAmber, 'THROTTLE');
    litText(ctx, plane.gearDown ? 'GEAR DOWN' : 'GEAR UP', width - 190, height - 62, '12px monospace', '#cfe3ff');
    litText(ctx, plane.flaps ? 'FLAPS' : '', width - 100, height - 62, '12px monospace', C.hudAmber);

    // Next target readout, centre top.
    var target = global.KestrelMissions.nextTarget(mission);
    if (target && state === 'flying') {
      var dist = Math.round(Math.hypot(plane.x - target.x, plane.y - target.y, plane.z - target.z));
      var label = mission.rings.length ? 'RING ' + (target.index + 1) : 'CHECKPOINT ' + (target.index + 1);
      litText(ctx, label + '  —  ' + dist + ' M', width / 2, 74, 'bold 16px monospace', C.hudAmber, 'center');
      // Direction arrow toward the target.
      var ang = Math.atan2(target.x - plane.x, target.z - plane.z) - plane.heading;
      var ax = width / 2 + Math.sin(ang) * 52;
      var ay = 108 + -Math.cos(ang) * 22;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = C.hudAmber;
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(7, 7); ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Mission message, centre.
    if (mission.messageTime > 0 && mission.message) {
      ctx.save();
      ctx.globalAlpha = clamp(mission.messageTime, 0, 1);
      litText(ctx, mission.message, width / 2, height * 0.30, 'bold 22px monospace', '#ffe9b0', 'center');
      ctx.restore();
    }

    // Stall + fuel warnings.
    if (plane.speed < C.minFlySpeed && plane.airborne && state === 'flying') {
      litText(ctx, 'STALL — NOSE DOWN, THROTTLE UP', width / 2, height * 0.36, 'bold 18px monospace', C.hudRed, 'center');
    }
    if (plane.fuel < 20 && plane.fuel > 0 && state === 'flying') {
      litText(ctx, 'LOW FUEL', width / 2, height * 0.40, 'bold 18px monospace', C.hudRed, 'center');
    }
    if (plane.fuel <= 0 && state === 'flying') {
      litText(ctx, 'FUEL EMPTY — GLIDING', width / 2, height * 0.40, 'bold 18px monospace', C.hudRed, 'center');
    }
  }

  function drawBar(ctx, x, y, w, h, frac, colour, label) {
    ctx.fillStyle = 'rgba(10, 16, 28, 0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = 6;
    ctx.fillRect(x, y, Math.max(0, w * clamp(frac, 0, 1)), h);
    ctx.shadowBlur = 0;
    litText(ctx, label, x, y - 8, '10px monospace', '#cfe3ff');
  }

  function drawArtificialHorizon(ctx, x, y, r, plane) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(-plane.roll);
    ctx.translate(0, plane.pitch * r * 1.4);
    ctx.fillStyle = '#3a6ea8';
    ctx.fillRect(-r, -r * 2, r * 2, r * 2);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-r, 0, r * 2, r * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.hudAmber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + 14, y);
    ctx.stroke();
    ctx.restore();
    litText(ctx, 'ATTITUDE', x, y + r + 12, '10px monospace', '#cfe3ff', 'center');
  }

  function drawMenu(ctx, width, height, missionIndex) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.45)';
    ctx.fillRect(0, 0, width, height);
    litText(ctx, 'KESTREL RIDGE', width / 2, height * 0.24, 'bold 54px monospace', '#ffd9a0', 'center');
    litText(ctx, 'DAWN PATROL — A FLIGHT GAME', width / 2, height * 0.24 + 44, 'bold 18px monospace', C.hudCyan, 'center');
    var list = global.KestrelMissions.MISSIONS;
    for (var i = 0; i < list.length; i++) {
      var y = height * 0.44 + i * 34;
      var sel = i === missionIndex;
      litText(ctx, (sel ? '▶ ' : '   ') + (i + 1) + '. ' + list[i].name.toUpperCase() + ' — ' + list[i].brief,
        width / 2, y, (sel ? 'bold 16px' : '15px') + ' monospace', sel ? '#ffe9b0' : '#cfe3ff', 'center');
    }
    litText(ctx, 'ARROWS / WASD — FLY    MOUSE — STEER    SHIFT — THROTTLE    ENTER / CLICK — TAKE OFF',
      width / 2, height * 0.44 + 3 * 34 + 34, '14px monospace', '#ffffff', 'center');
    litText(ctx, 'LAND ON THE RUNWAY. MIND THE FUEL. THREAD THE RINGS.',
      width / 2, height * 0.44 + 3 * 34 + 60, '14px monospace', C.hudAmber, 'center');
  }

  function drawEnd(ctx, width, height, title, lines, colour) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.55)';
    ctx.fillRect(0, 0, width, height);
    litText(ctx, title, width / 2, height * 0.36, 'bold 44px monospace', colour, 'center');
    for (var i = 0; i < lines.length; i++) {
      litText(ctx, lines[i], width / 2, height * 0.36 + 44 + i * 28, 'bold 18px monospace', '#ffffff', 'center');
    }
    litText(ctx, 'PRESS R TO FLY AGAIN', width / 2, height * 0.36 + 44 + lines.length * 28 + 26, '15px monospace', C.hudAmber, 'center');
  }

  // One frame: sky, clouds, terrain, rings, plane, HUD, overlays.
  function renderFrame(ctx, width, height, plane, mission, state, missionIndex, clouds, time) {
    ctx.clearRect(0, 0, width, height);
    drawSky(ctx, width, height, plane);
    var cam = makeCamera(plane, width, height);
    for (var i = 0; i < clouds.length; i++) drawCloud(ctx, cam, clouds[i]);
    drawTerrain(ctx, cam, plane, width, height);
    var targets = mission.rings.length ? mission.rings : mission.checkpoints;
    var next = global.KestrelMissions.nextTarget(mission);
    for (var j = 0; j < targets.length; j++) {
      drawRing(ctx, cam, targets[j], next === targets[j], time);
    }
    drawPlane(ctx, width, height, plane, time);
    drawHud(ctx, width, height, plane, mission, state);
    if (state === 'menu') drawMenu(ctx, width, height, missionIndex);
    if (state === 'crashed') {
      drawEnd(ctx, width, height, 'CRASHED', global.KestrelMissions.missionSummary(mission), C.hudRed);
    }
    if (state === 'landed') {
      drawEnd(ctx, width, height, 'TOUCHDOWN', global.KestrelMissions.missionSummary(mission), C.hudGreen);
    }
    if (state === 'paused') {
      litText(ctx, 'PAUSED — P TO RESUME', width / 2, height * 0.5, 'bold 26px monospace', '#ffffff', 'center');
    }
  }

  global.KestrelRender = {
    renderFrame: renderFrame,
    makeCamera: makeCamera
  };
})(typeof window !== 'undefined' ? window : globalThis);
