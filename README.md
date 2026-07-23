# Racing

Clean foundation for a standalone, mobile-first 2D web racing game.

## Foundation

- React
- TypeScript
- Vite
- Phaser
- Portrait-first 9:16 game surface

The current project is client-only. Its source is separated into React
application code and Phaser game code so the repository can later evolve into
top-level `client/`, `server/`, and `shared/` packages without coupling the
foundation to a server architecture now.

This root commit intentionally contains no physics, racing gameplay,
multiplayer, WebSocket, Telegram API, database, profiles, rating, game data, or
production assets.

## Local development

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

## Checks

```sh
npm run typecheck
npm run lint
npm run build
```

## Source layout

- `src/client/App.tsx` — React application shell
- `src/client/game/` — Phaser configuration and scenes
- `src/main.tsx` — browser entry point
- `src/styles.css` — mobile-first layout
