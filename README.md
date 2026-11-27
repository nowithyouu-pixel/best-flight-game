# Kestrel Ridge — Dawn Patrol

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/nowithyouu-pixel/best-flight-game/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/nowithyouu-pixel/best-flight-game/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A complete, original flight game for the [make.fun best flight game bounty](https://make.fun/c/best-flight-game-20261126-0057). Fly the Kestrel, a little red prop plane, down a dawn-lit valley: thread glowing rings, mind the fuel, and put her down on the runway.

## Play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and visit http://localhost:8080). No build step, no network — every file the game loads lives under `game/`.

- **Arrows / WASD** — pitch and roll
- **Mouse** — steer toward the pointer; **left button** throttle up, **right button** throttle down
- **Shift / Ctrl** — throttle up / down, **B** — brake, **Space** — flaps
- **1 / 2 / 3** — pick a sortie, **Enter / click** — take off, **P** — pause, **M** — mute, **R** — restart

## Sorties

1. **Ring Run** — thread all 8 dawn rings down the valley, then land on the strip.
2. **Ridge Delivery** — pass 3 checkpoints over the ridge, then land.
3. **Free Flight** — no course, no clock; fly the valley and land when ready.

Fuel burns with throttle, a hard landing damages the hull, and slow wings stall. A gentle touchdown on the runway scores, with a time bonus when the course is clear.

## Layout

- `game/index.html` — the page; `game/src/` holds one job per file:
  `config.js` (tuning), `random.js` (seeded noise), `terrain.js` (valley, river, runway, rings), `plane.js` (flight model), `input.js` (keyboard + mouse), `missions.js` (sorties and scoring), `audio.js` (synthesized engine and wind), `render.js` (software 3D, plane, HUD), `shots.js` (screenshot presets), `main.js` (loop and states).
- `screenshots/` — real renders of the game itself, taken in a headless browser.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
- `serve.ts` — a tiny static server for local play-testing.

## License

MIT — see [LICENSE](LICENSE).
