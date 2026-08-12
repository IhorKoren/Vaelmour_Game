# Phase 8.2 staging — Neon, Render, Telegram

## Topology and secrets

The static frontend uses HTTPS. Render runs the long-lived Node backend and WSS endpoint. PostgreSQL is external Neon through the Render secret `DATABASE_URL`.

Required backend variables:

```dotenv
NODE_ENV=production
DATABASE_URL=<Neon secret; never commit>
TELEGRAM_BOT_TOKEN=<secret>
SESSION_SECRET=<32+ random characters>
APP_ORIGIN=https://<frontend-host>
ALLOWED_ORIGINS=https://<frontend-host>
ALLOW_DEV_AUTH=false
ADMIN_MODE=false
ADMIN_TELEGRAM_USER_IDS=
SESSION_TTL_SECONDS=86400
MAX_SESSIONS_PER_ACCOUNT=8
SESSION_CLEANUP_INTERVAL_MS=900000
TELEGRAM_AUTH_MAX_AGE_SECONDS=3600
HOST=0.0.0.0
```

Frontend build variables are public and contain endpoints only:

```dotenv
VITE_API_URL=https://<render-backend>
VITE_WS_URL=wss://<render-backend>/ws
```

Never place the bot token, session secret, `initData`, smoke session, or database URL in `VITE_*`, Git, CI output, or telemetry.

## Migration and container policy

Migrations are checked-in and forward-only. `Dockerfile.backend` uses a builder and a production runtime. For current single-instance staging the container command is explicitly:

```text
npm run db:deploy && npm run start:server
```

This makes Render staging self-contained. Before multi-instance production, move `db:deploy` to a single release job. Never use `prisma migrate reset` outside local development.

Render readiness remains `/ready`. It verifies database connectivity and migration `20260812010000_phase8_reliability`.

## Restart/recovery contract

Paid-slot settlement and the durable expedition marker commit atomically. After a crash between commit and in-memory activation, startup recovery marks the expedition `SERVER_INTERRUPTED` once and creates one notice per player. Settlement is not repeated or refunded.

In-memory combat is intentionally lost on restart. Already committed XP/coins and potion consumption remain. Unextracted temporary loot is not invented. PRE_START/ACCEPTED slot reservations are refunded; SETTLED reservations remain settled. Open Trade escrow is returned. The next login returns the player to City after the interruption notice.

## Pre-deploy verification

```powershell
npm ci
npm run db:generate
npm run lint
npm test
npm run validate:content
npm run build
npm run simulate:balance:smoke
npm run simulate:economy
$env:DATABASE_URL='<isolated database>'
npm run db:deploy
npm run test:db
```

Push only after reviewing `git status`, `git diff`, `git diff --cached`, migrations, and scanning for secrets. Required GitHub CI must be green before deployment.

## Automated staging smoke

Read-only smoke:

```powershell
$env:SMOKE_API_URL='https://<render-backend>'
$env:SMOKE_WS_URL='wss://<render-backend>/ws'
$env:SMOKE_APP_ORIGIN='https://<frontend-host>'
$env:SMOKE_SESSION_TOKEN='<short-lived staging session>'
npm run smoke:staging
```

The script checks frontend HTTPS, `/health`, `/ready`, authenticated WSS, authoritative player identity, character state, Market, Guild, and Party list. Use dedicated disposable accounts for mutation/multiplayer smoke; never paste their tokens into source or logs.

## Manual restart test

1. Start a paid or free Rift with disposable staging accounts.
2. Record wallet, potion count, and current expedition ID.
3. Restart the backend once.
4. Confirm startup logs report recovery without a crash loop.
5. Reopen clients; each receives `SERVER_INTERRUPTED_RIFT` and reaches City.
6. Verify paid settlement, XP/coins, and consumed potion did not duplicate; pending reservations/trades were refunded exactly once.
7. Repeat backend restart and verify recovery count is zero for the same expedition.

## Real Telegram Mini App checklist

This requires a real test bot and Telegram accounts; automated backend checks do not prove it.

1. Open the bot Mini App and confirm Telegram authentication and character load.
2. Check City on a phone viewport, safe areas, keyboard forms, BackButton cleanup, and WSS connected state.
3. Open Inventory, Craft, Market, Guild, Friends, and Chat.
4. Create a party alone, READY, and START. The solo warning must not block.
5. Resolve a combat round, including a potion/action, then exit or finish and confirm City return.
6. Reopen the Mini App and confirm persistent state.
7. With a second account, join, READY both clients, START duo, and verify realtime snapshots.
8. During a Rift close/reopen one client inside grace and confirm restoration. After grace confirm `RIFT_RECONNECT_EXPIRED`, then confirm the next login after terminal cleanup reaches City.

If a step fails, capture the UTC time, frontend/backend revision, HTTP status, WebSocket close code, safe structured log event names, and the visible error code. Do not send tokens or raw Telegram `initData`.

## Rollback

Redeploy an older application revision only if it is compatible with applied migrations. Database rollback is a reviewed forward corrective migration, never a destructive reset. Verify `/health`, `/ready`, WSS, and smoke after rollback.
