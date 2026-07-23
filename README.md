# Racing Prototype v0.2

Live multiplayer prototype for a portrait-first 2D web racing game.

## What v0.2 tests

Players enter one shared `default` room immediately. Each browser simulates its
own car locally and sends state snapshots at a fixed network rate. Remote cars
are translucent, non-colliding, and rendered from a short interpolation buffer.

Included:

- all v0.1 driving, touch controls, track, laps, camera, HUD, and tuning;
- standalone Node.js WebSocket server;
- temporary connection-scoped player IDs and automatic colors;
- late join, disconnect cleanup, and reconnect;
- 20 state updates per second;
- position and shortest-path rotation interpolation;
- runtime remote opacity and interpolation-delay tuning;
- typed shared client/server protocol.

Not included: race start synchronization, lobby, matchmaking, player
collisions, database, profiles, Telegram authentication, results, chat, or
final art.

## Run locally

Requires Node.js 22.13 or newer.

Install once:

```sh
npm install
```

Start the multiplayer server:

```sh
npm run dev:server
```

In another terminal, start the web client:

```sh
npm run dev -- --host
```

Open the Vite URL in two browser tabs or two phones on the same network. The
client derives the WebSocket hostname from the page URL and uses port `8080`.

For another production endpoint, copy `.env.example` to `.env` and configure:

```sh
VITE_WEBSOCKET_URL=wss://racing.example.com/ws
```

## Render server deployment

`render.yaml` defines a Free Node.js Web Service for the multiplayer server.
The repository root remains the service root:

```text
Build: npm ci && npx tsc -b tsconfig.server.json
Start: npm run start:server
Health: /health
```

Render supplies the internal `PORT`; local development falls back to `8080`.
Set the Netlify production environment variable to the deployed service URL
without a custom port:

```sh
VITE_WEBSOCKET_URL=wss://<render-service>.onrender.com
```

## Checks

```sh
npm run typecheck
npm run lint
npm run test:server
npm run build
```

## Architecture

```text
src/
|-- client/
|   |-- game/
|   `-- multiplayer/
`-- shared/
    `-- multiplayer/
server/
|-- index.ts
|-- multiplayerServer.ts
`-- multiplayerServer.test.ts
```
