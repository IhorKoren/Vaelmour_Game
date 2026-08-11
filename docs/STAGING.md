# Phase 8 staging deployment

## 1. Required services and topology

- Static frontend hosting with HTTPS.
- A long-running Node.js backend with persistent WebSocket support. Do not deploy the backend to a request-only/serverless runtime that suspends or terminates WebSockets.
- Persistent PostgreSQL with provider-managed storage and backups.
- One Telegram bot whose Mini App/Web App URL points to this game's staging frontend.

```text
Telegram client -> HTTPS static frontend
Telegram client -> HTTPS /auth/* -> Node backend
Telegram client -> WSS /ws -> same long-running Node backend
Node backend -> TLS PostgreSQL
```

No deployment provider is hardcoded into gameplay code. TLS may terminate at a reverse proxy, but the public frontend and WebSocket URLs must be `https://` and `wss://`.

## 2. PostgreSQL

Create a dedicated staging database/user and set `DATABASE_URL`. Never use `prisma migrate reset` against staging or production.

```powershell
npm ci
npm run db:generate
npm run db:deploy
```

`db:deploy` runs checked-in, forward-only migrations. `db:migrate` and `db:reset` are development commands only.

## 3. Backend variables

Required staging values:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=provided-out-of-band
SESSION_SECRET=at-least-32-random-characters
APP_ORIGIN=https://staging-game.example
ALLOWED_ORIGINS=https://staging-game.example
ALLOW_DEV_AUTH=false
ADMIN_MODE=true
ADMIN_TELEGRAM_USER_IDS=123456789
SESSION_TTL_SECONDS=86400
TELEGRAM_AUTH_MAX_AGE_SECONDS=3600
HOST=0.0.0.0
PORT=8787
```

`WS_ORIGIN` documents the public endpoint but is not used as an origin allowlist; browsers send the HTTPS frontend Origin during a WSS upgrade. Never expose `TELEGRAM_BOT_TOKEN`, `SESSION_SECRET`, `DATABASE_URL`, or smoke credentials in frontend variables.

Start the long-running backend after migrations:

```powershell
npm run build
npm run start:server
```

The process manager must keep this Node process running, forward `SIGTERM`, preserve WebSocket connections and allow at least 10 seconds for graceful shutdown. `Dockerfile.backend` provides a provider-neutral backend image; it does not serve the static frontend or run migrations automatically.

## 4. Frontend variables

Set these at frontend build time:

```dotenv
VITE_API_URL=https://staging-api.example
VITE_WS_URL=wss://staging-api.example/ws
```

Then run `npm run build` and publish `dist/` as static files. Do not put bot/session/database secrets in `VITE_*` variables; Vite embeds them in the public bundle.

## 5. Telegram configuration

1. Create or select the dedicated test bot in BotFather.
2. Configure its Mini App/Web App URL as the exact HTTPS staging frontend URL.
3. Add the staging domain to the bot configuration where Telegram requires it.
4. Store the bot token only in the backend secret manager.
5. Open the Mini App from Telegram. The client sends raw `Telegram.WebApp.initData` to `/auth/telegram`; it never sends a parsed user as identity.
6. The server validates the official HMAC data-check-string and `auth_date`, then links the numeric Telegram user ID to one Account.

Official algorithm: <https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app>.

For local browser development only, use `NODE_ENV=development` and explicitly set `ALLOW_DEV_AUTH=true`. Production config rejects this combination.

## 6. Health and WebSocket verification

```powershell
curl.exe https://staging-api.example/health
curl.exe https://staging-api.example/ready
$env:SMOKE_API_URL='https://staging-api.example'
$env:SMOKE_WS_URL='wss://staging-api.example/ws'
$env:SMOKE_APP_ORIGIN='https://staging-game.example'
$env:SMOKE_SESSION_TOKEN='<short-lived test session>'
npm run smoke:staging
```

Alternatively use a fresh raw `SMOKE_TELEGRAM_INIT_DATA` immediately after opening the Mini App. Treat it as a secret and remove it from the shell after the smoke run. The script checks frontend, health/readiness, auth/session, WSS, character state, Market, Guild and Rift Lobby state; it does not start an expedition.

## 7. Deployment checklist

1. Back up PostgreSQL and record the currently deployed revision.
2. Run tests, content validation, lint and production build.
3. Run `npm run db:deploy` once against staging.
4. Deploy/restart the backend and wait for `/ready`.
5. Deploy the frontend with the matching API/WSS URLs.
6. Run `npm run smoke:staging`.
7. Open the Mini App from at least two real Telegram accounts and create/join a party.
8. Confirm structured logs contain references, not credentials.
9. After playtesting, run `npm run report:playtest` with staging `DATABASE_URL`.

## 8. Restart and rollback

On shutdown the backend stops new parties/expeditions, closes WebSockets with restart code 1012, waits for current operations, and disconnects Prisma within a bounded window. In-memory Rift combat is not resumed after a process restart. At the next boot:

- active expedition markers become `SERVER_INTERRUPTED`;
- unextracted resources/recipes are not committed and no normal 50% failure extraction runs;
- already committed encounter XP/coins and already consumed potions remain committed through idempotent operation keys;
- PRE_START/ACCEPTED party-slot reservations are refunded;
- SETTLED slot payments are not refunded or repeated;
- unfinished trades are cancelled/refunded;
- affected players receive one interruption message and return to City.

For application rollback, redeploy the previous revision only if it is compatible with the already-applied schema. Database migrations are forward-only; use a reviewed corrective migration rather than destructive reset.

## 9. Backup and restore checklist

- Enable regular automated PostgreSQL snapshots and point-in-time recovery where the provider supports it.
- Encrypt backups and restrict access to the operations team.
- Periodically restore a backup into an isolated database and run `/ready` plus the smoke test.
- Before a schema deploy, take/verify a fresh backup and record retention/restore instructions.
- During restore, stop backend writes, restore into a clean target, apply any later forward migrations, switch `DATABASE_URL`, start one backend instance, then verify readiness and smoke checks.
- Never paste database URLs or backup encryption keys into tickets, source files, telemetry or chat.

## 10. Known staging limitations

- Active combat state remains in memory and is intentionally lost on restart.
- Sessions are PostgreSQL-backed; there is no Redis/session cache.
- Presence and chat rate limiting remain per process, so staging should run one backend instance unless shared fan-out is added later.
- Admin tools are HTTP-only, allowlisted and staging/dev-only; no public admin UI is provided.
- No automatic cloud backup or provider-specific deployment pipeline is included.
