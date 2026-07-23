# Racing Prototype v0.1

Core driving prototype for a portrait-first 2D web racing game.

## What v0.1 tests

The prototype tests whether one-finger analog steering feels readable and
enjoyable on a vertical phone screen. The car accelerates automatically. Touch
or click anywhere in the lower half of the game, then drag horizontally from
that neutral point to steer.

Included:

- one closed, hand-authored test track;
- one car using a small custom 2D driving model;
- track and off-road surface behavior;
- smooth, speed-dependent velocity look-ahead camera;
- sequential checkpoints, lap timer, and session best lap;
- minimal HUD and runtime driving-tuning panel;
- Phaser primitives only.

Not included: multiplayer, networking, Telegram integration, persistence,
profiles, rating, bots, multiple cars or tracks, audio, and final art.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

To test from a phone on the same Wi-Fi network:

```sh
npm run dev -- --host
```

Open the `Network` URL printed by Vite on the phone.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
```

## Gameplay source

```text
src/client/game/
├── config/drivingConfig.ts
├── entities/PlayerCar.ts
├── input/SteeringInput.ts
├── scenes/RacePrototypeScene.ts
├── track/PrototypeTrack.ts
├── createGame.ts
└── types.ts
```
