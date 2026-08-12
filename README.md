# Перший Розлом — Phase 8.2

Mobile-first Telegram Mini App vertical slice with authoritative multiplayer combat, PostgreSQL persistence, Market/Trade, Guilds, Friends, Chat, telemetry, and staging operations.

Phase 9 / Second Rift is intentionally out of scope.

## Local verification

Requires Node.js 24 and PostgreSQL when running integration tests.

```powershell
npm ci
npm run db:generate
npm run lint
npm test
npm run validate:content
npm run build
npm run simulate:balance:smoke
npm run simulate:economy
```

With `DATABASE_URL` pointing to an isolated PostgreSQL database:

```powershell
npm run db:deploy
npm run test:db
```

Local development uses `npm run dev`. Production uses the compiled SSR server bundle through `npm run start:server`.

## First Rift party rules

- Supported party size: **1–5**.
- Recommended size: **3–5**, advisory only.
- The leader may START solo or below the recommendation.
- Every current member must be authenticated, connected, ready, have floor access, and have a valid paid-slot reservation when applicable.
- Central enemy multipliers preserve the existing 3/4/5 model and add explicit solo/duo tuning. See [reports/phase8-2-balance-report.md](reports/phase8-2-balance-report.md).

## Reliability boundaries

- Gameplay mutations are server-authoritative and use durable operation keys.
- Failed observational telemetry writes are logged, retried with the same event key, and cannot leave `room.resolving` locked.
- Rift START settles paid slots and creates the durable `active_expeditions` marker in one Serializable repository transaction.
- A committed marker that is not activated in memory is recovered as `SERVER_INTERRUPTED` on startup; settlement is not repeated.
- Encounter XP/coins, potion consumption, loot extraction, Market operations, Trade, and paid slots are idempotent under retry/reconnect.
- `BUY_NOW` / `SELL_NOW` retain the exact created order ID and can only cancel that order's remainder.

## Reconnect and restart

- `AUTH_SESSION_EXPIRED`/session authentication and `RIFT_RECONNECT_EXPIRED` are separate lifecycle failures.
- Lobby disconnect expiry removes the member, refunds an unsettled reservation, transfers leadership, and deletes an empty room.
- Combat participants remain locked into the run during the grace window. Terminal outcomes centrally clear timers, presence/economy locks, room membership, and stale room state.
- In-memory combat is not resumed after a backend restart. Durable committed rewards/potions/payments remain committed; active markers become `SERVER_INTERRUPTED`; pending slots and trades are refunded/cancelled.

## Security

- Telegram `initData` is verified server-side with HMAC, `auth_date`, signed user identity, and timing-safe comparison.
- Production refuses development authentication.
- Sessions are stored as hashes, cleaned periodically, and limited per account.
- Incoming WebSocket messages receive runtime shape/value validation, 64 KiB payload protection, HELLO deadline, heartbeat, flood protection, and serialized per-socket processing.
- Presence is fanned out only to the player, party, friends, and guild, respecting blocks.
- Structured logs redact credential-bearing keys and secret patterns from error messages/stacks.
- Player names use server-generated NFKC/case-normalized `nameKey` with a database unique constraint.

## Database and deployment

Prisma migrations are forward-only. Never use `db:reset` against staging/production. Render receives external Neon `DATABASE_URL` as a secret (`sync: false`); no database URL is committed.

Economy and social mutations run in Serializable transactions with idempotent operation keys and scoped advisory locks. The Phase 8 persistence adapter applies row-level deltas for players, inventory, orders, fills, trades, reservations, guilds, relationships, chat, and read state; it no longer deletes and recreates whole tables. Snapshot reads remain a transitional implementation and should be replaced by paginated/query-specific repositories before MMO-scale traffic.

The backend Docker image is multi-stage. The current staging policy intentionally runs `prisma migrate deploy` before the compiled server in the container command. A multi-instance production topology should move migrations to a separate release job.

Health endpoints:

- `/health` — process liveness.
- `/ready` — startup, database, and latest migration readiness.
- `/ws` — authenticated WebSocket endpoint.

Deployment and Telegram verification steps are in [docs/STAGING.md](docs/STAGING.md).

## Reports

- [Phase 8.2 party balance](reports/phase8-2-balance-report.md)
- [Economy supply model](reports/economy-supply-report.md)
- [Playtest report](reports/playtest-report.md)

The macro economy report is diagnostic only and does not automatically change production rewards or sinks.
