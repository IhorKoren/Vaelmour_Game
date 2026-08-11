# Перший Розлом — Phase 6

Mobile-first Telegram WebApp PvE vertical slice. Phase 6 додає persistent Guilds, Guild Storage, Friends, Block, Global/Guild/Private Chat і realtime Presence поверх систем Phase 1–5, не змінюючи server-authoritative combat, crafting, loot, Market і Trade flow.

## Локальний запуск

Потрібні Node.js 22+ і Docker із Docker Compose.

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d
npm run dev
```

`npm run dev` спочатку генерує Prisma Client, застосовує наявні migrations, а потім запускає client і server:

- client: `http://localhost:5173`
- WebSocket: `ws://127.0.0.1:8787`
- health: `http://127.0.0.1:8787/health`
- PostgreSQL: `127.0.0.1:5434`

Зупинка локальної БД без видалення даних:

```powershell
docker compose down
```

## Database і migrations

```powershell
npm run db:generate       # regenerate Prisma Client
npm run db:migrate        # create/apply a development migration
npm run db:deploy         # apply committed migrations
npm run db:studio         # inspect data
npm run db:reset          # DEV: recreate schema and delete all DB data
```

Початкова migration: `prisma/migrations/20260810190000_phase4_persistence/migration.sql`.

Для скидання одного development account передайте його локальний dev-token (значення ключа `first-rift-dev-token` у localStorage):

```powershell
npm run dev:reset-player -- "TOKEN"
```

Команда заблокована, якщо `NODE_ENV=production`. Після reset клієнт автоматично повернеться до створення персонажа при наступному підключенні.

## Схема даних

- `accounts` — стабільний `accountId`, HMAC hash dev-token; raw token у DB не записується.
- `players` — один персонаж на account: name, class, level, current XP, available coins, reserved coins і version.
- `item_entries` — нормалізовані persistent instance IDs, item ID, quantity, location (`INVENTORY`, `STORAGE`, `EQUIPPED`, `MARKET_ESCROW`, `TRADE_ESCROW`) та один із 9 equipment slots.
- `learned_recipes` — unique `(playerId, recipeId)`.
- `coin_ledger` — amount, resulting balance, reason, optional reference ID та timestamp.
- `economy_operations` — durable idempotency keys для критичних мутацій.
- `market_orders` / `market_fills` — persistent BUY/SELL books, escrow references, partial fills і recent price history.
- `direct_trades`, `trade_offer_items`, `trade_offer_coins` — revisioned two-party trade state та normalized offers.
- `party_slot_reservations` — durable PRE_START/ACCEPTED/SETTLED/REFUNDED slot payments.

Schema містить foreign keys із cascade delete, ownership/location indexes, unique account/player/recipe/equipment-slot/operation constraints та SQL checks для невід’ємних XP/coins, позитивної quantity і коректного equipment location.

Item/recipe stats не дублюються в PostgreSQL: authoritative definitions залишаються в `shared/game-data`. Attack і Max HP обчислюються як class base + level + equipment. При читанні persisted equipment сервер повторно перевіряє catalog item, slot, quantity та class restriction.

## Account і dev-auth

Browser зберігає лише непрозорий `first-rift-dev-token`. Під час першого `HELLO` сервер у Serializable transaction створює Account, Player, starter equipment, 5 Healing Potions, test resources і profession starter recipes. Подальші підключення і reload надсилають лише token; сервер повертає стабільні `accountId`/`playerId` і authoritative character state.

Client-provided `playerId`, accountId, Telegram ID, coins, XP, inventory, stats і rewards не використовуються як source of truth. Production WebSocket визначає Player лише через validated opaque session; dev-token adapter доступний тільки в явно ввімкненому local development mode.

## Transaction model

`PlayerStateService` містить domain rules, `PlayerRepository` визначає persistence boundary, а production runtime використовує `PrismaPlayerRepository`.

Кожна economy mutation виконується однією Serializable PostgreSQL transaction. Phase 4 player-only операції використовують per-player advisory lock, а Phase 5 cross-player операції — спільний economy advisory lock:

1. transaction бере per-player advisory lock;
2. перевіряє durable operation key;
3. завантажує authoritative profile;
4. виконує всі validation/domain changes на transaction-local state;
5. атомарно записує player/items/recipes, ledger (за потреби) та operation record;
6. commit або повний rollback.

Цей boundary використовується для craft, learn recipe, inventory/storage move, equip/unequip, potion consumption, encounter XP/coin reward + ledger та extraction. Prisma `P2034` serialization/deadlock conflicts повторюються до трьох разів.

Locked combat snapshots і active rooms залишаються in-memory. На START server завантажує persisted stats/equipment/potion quantity. Potion heal застосовується лише після успішного atomic списання. Coins/XP фіксуються один раз на encounter; expedition resources/recipes — однією extraction transaction (100% success/exit, configured 50% on failure).

## Idempotency

- UI додає унікальний `operationId` до craft/learn/move/equip requests.
- Encounter reward key містить player + encounter reference.
- Potion key містить room + round + player.
- Extraction key містить player + expedition/room reference.
- `economy_operations.operation_key` має unique constraint і записується в тій самій transaction, що й результат.
- Coin ledger додатково має unique `(playerId, reason, referenceId)`.

Duplicate WebSocket message, reconnect або повторний server event повертає поточний state без другого списання/нагороди. Per-player advisory lock серіалізує два одночасні craft/potion requests; перевитрата не може пройти validation після першого commit.

## Phase 5 economy

### Reservation та escrow

`Player.coins` є available/spendable balance, `reservedCoins` — фізично відокремлені кошти. UI показує total (`coins + reservedCoins`), reserved і available. Buy Order, Trade та Party Slot спочатку переміщують coins з available у reserved; тому жодна інша система не може витратити їх повторно.

Reserved items зберігають persistent entry ID і server-only location `MARKET_ESCROW` або `TRADE_ESCROW`. Вони більше не входять до Inventory/Storage/Equipment і недоступні crafting, equipment та іншій reservation. Stack можна розділити; individual equipment завжди рухається з quantity 1 і зберігає той самий instance ID.

### Market matching

- BUY book: highest price, потім oldest first.
- SELL book: lowest price, потім oldest first.
- Match існує, коли `bestBuy >= bestSell`; self-match заборонений.
- Settlement використовує maker price — ціну старішого order.
- Quantity дорівнює мінімальному remaining quantity, тому partial fills залишають order `PARTIALLY_FILLED`.
- BUY reserve повертає різницю між limit і maker price.
- Buyer отримує item, seller — gross value мінус configurable 2% transaction fee.
- Buy Order fee 1% стягується при створенні й не повертається; purchase reserve при cancel повертається.

Buy Now і Sell Now визначають crossing limit із поточного price-time book і використовують той самий matching engine. Recent item history містить останні 20 fills без charts.

### Direct Trade state machine

```text
REQUESTED → ACTIVE → COMPLETED
     └────→ DECLINED
ACTIVE ───→ CANCELLED
```

Receiver знаходиться сервером за exact player name. Обидва players мають бути online, поза COMBAT і без іншого active trade. Кожна зміна повного offer атомарно перевстановлює item/coin reservations, збільшує `revision` і скидає обидва confirmations. Confirm приймається тільки для актуальної revision. Коли обидва підтвердили одну revision, items і coins обмінюються однією transaction; будь-яка помилка робить повний rollback. Disconnect або startup recovery скасовує незавершений trade й повертає escrow.

### Paid Party Slot lifecycle

```text
APPLY + reserve → PRE_START → ACCEPTED → START settlement → SETTLED
                         └── reject/cancel/leave/restart → REFUNDED
```

Applicant сам задає offer. Accept не платить Leader. Перед переходом `LOBBY → COMBAT` server однією aggregate transaction перевіряє всі accepted reservations і переказує всі offers Leader; якщо один settlement некоректний, Rift не стартує і ніхто не отримує часткову оплату. Після успішного START payment не повертається навіть при поразці. На startup усі orphaned pre-start reservations автоматично refund.

### Нові WebSocket messages

Client intents: `GET_MARKET` (з опційним `itemId`), `GET_MY_ORDERS`, `CREATE_SELL_ORDER`, `CREATE_BUY_ORDER`, `CANCEL_MARKET_ORDER`, `BUY_NOW`, `SELL_NOW`, `REQUEST_TRADE`, `ACCEPT_TRADE`, `DECLINE_TRADE`, `UPDATE_TRADE_OFFER`, `CONFIRM_TRADE`, `CANCEL_TRADE`. `APPLY_TO_PARTY` тепер підтримує `slotOfferCoins`.

Server events: `MARKET_SNAPSHOT`, `TRADE_REQUEST`, `TRADE_STATE`, `TRADE_COMPLETED`, `TRADE_CANCELLED`, `ECONOMY_UPDATE`, а наявні `PARTY_STATE` та `ERROR` розширені Phase 5 даними/validation.

## Phase 6 social layer

### Database schema

- `guilds` — case-insensitive unique name/tag keys, description, Message of the Day та єдиний leader reference.
- `guild_members`, `guild_applications`, `guild_invites`, `guild_rank_permissions` — normalized membership, join workflow і fixed rank permissions.
- `guild_storage_items`, `guild_storage_logs` — guild-owned item instances та останні audit actions.
- `friend_requests`, `friendships`, `player_blocks` — persistent requests, одна canonical symmetric friendship row і directional block.
- `private_conversations`, `social_chat_messages`, `chat_read_states` — persistent channel scopes, cursor history і unread foundation.

Migration: `prisma/migrations/20260811210000_phase6_social/migration.sql`.

### Guild state і permissions

Fixed ranks: `LEADER`, `OFFICER`, `MEMBER`, `RECRUIT`. Тільки Leader редагує Guild, ranks, permissions, leadership і disband. Officer може запрошувати, приймати заявки та виключати Member/Recruit. Default storage permissions: Leader/Officer/Member можуть deposit і withdraw; Recruit може deposit, але не withdraw. `GUILD_CREATION_COST = 500`, `GUILD_MAX_MEMBERS = 50` зберігаються у shared config.

Leadership transfer є однією Serializable transaction: старий Leader стає Officer, target стає Leader, `guild.leaderPlayerId` змінюється разом із ranks. Disband потребує explicit confirmation і порожнього Guild Storage.

### Guild Storage ownership

Guild Storage не використовує nullable player ownership. `GuildStorageItem.id` є identity guild-owned asset. Full deposit переносить той самий instance ID з personal Inventory; partial stack deposit створює окремий guild stack identity. Full equipment withdraw повертає оригінальний ID іншому authorized player. Операції під одним advisory lock перевіряють membership, rank permission, quantity, inventory location та `operationId`.

Equipped, Market escrow, Trade escrow, expedition і вже reserved items не можна deposit. Guild asset не можна напряму передати в Market/Trade/Craft: спочатку потрібен audited withdraw до personal Inventory.

### Friends і Block

Friend request persistent. Accepted friendship зберігається одним canonical `(playerLowId, playerHighId)` relation і тому симетрична за визначенням. Block directional: блокує friend requests, Private Chat delivery і notifications, але не Guild interactions та не видаляє стару Global history.

### Chat architecture

`ChatService` є спільним validation/persistence boundary для `GLOBAL`, `GUILD`, `PRIVATE`; existing `GROUP` проходить через той самий message validation/rate limiter, але залишається lightweight room-scoped in-memory chat для combat.

- plain text, server sender/timestamp, максимум 300 characters;
- Global rate limit 1/2s, Guild/Private/Group 1/s;
- Global history retention 5000, client page до 100;
- Guild history доступна лише поточним members;
- Private conversation canonical для двох players, із conversation list та unread counts;
- cursor foundation: `beforeMessageId` і `nextCursor`.

### Presence

`PresenceService` зберігає ephemeral `OFFLINE`, `CITY`, `PARTY_LOBBY`, `RIFT`. Connect/disconnect та Room lifecycle оновлюють status; Guild roster і Friends snapshots поєднують persistent profiles із realtime presence. PostgreSQL не є source of truth для online status.

### Phase 6 protocol

Guild intents: `GET_GUILD_STATE`, `SEARCH_GUILDS`, `CREATE_GUILD`, applications, invites, leave/kick/rank/leadership/update/permissions/disband, storage deposit/withdraw/history.

Friends intents: `SEARCH_PLAYER`, `GET_FRIENDS_STATE`, friend request/accept/decline/remove, block/unblock. Chat intents: `SEND_CHAT_MESSAGE`, `GET_CHAT_HISTORY`, `GET_PRIVATE_CONVERSATIONS`. Party integration: `INVITE_TO_PARTY`.

Server events: `GUILD_STATE`, `GUILD_LIST`, `GUILD_STORAGE_UPDATE`, `GUILD_STORAGE_HISTORY`, `FRIENDS_STATE`, `PLAYER_SEARCH_RESULT`, `PRESENCE_UPDATE`, `CHAT_MESSAGE`, `CHAT_HISTORY`, `PRIVATE_CONVERSATIONS`, `UNREAD_UPDATE`, `PARTY_INVITE`.

## Перевірки

```powershell
npm test
npm run test:db       # real PostgreSQL restart/persistence smoke test
npm run validate:content
npm run simulate:balance
npm run lint
npm run build
```

Збережено всі 191 тести Phase 1–6 і додано 47 Phase 7 tests (усього 238):

- restart/reload для player, inventory, storage, equipment, recipes, coins та XP/level;
- atomic/duplicate starter initialization;
- craft rollback і concurrent overspend protection;
- learn rollback та duplicate prevention;
- atomic inventory/storage move;
- persisted equip ownership/class validation;
- coin ledger та duplicate coin/XP reward;
- concurrent potion protection;
- success, duplicate і failed extraction;
- reconnect без дублювання economy state.
- Market escrow, fees, price-time priority, partial fills, maker price, individual ownership, duplicate/concurrent settlement, Buy Now і Sell Now;
- Direct Trade request/accept, restrictions, revision reset, stale confirmation, atomic item/coin swap, rollback, disconnect та duplicate final confirm;
- Paid Slot reserve/refund/accept/START, multi-member atomic settlement, duplicate START, orphan cleanup та RoomManager integration;
- усі cross-system coin/item reservation conflicts.
- Guild creation cost/uniqueness/membership, applications, invites, rank permissions, leadership, leave/disband і max members;
- Guild Storage permissions, partial stacks, instance identity, escrow/equipment conflicts, idempotency, concurrency та audit log;
- Friends request/accept/reject/remove symmetry, duplicate/self protection і Block;
- Global/Guild/Group/Private Chat routing, limits, rate limiting, pagination, persistence, idempotency та combat lightweight isolation;
- connect/disconnect, City/Party/Rift presence, Friends updates і Guild roster online state.
- 3 data-driven floors із 6/8/10 encounter та валідні enemy/boss/loot/recipe references;
- persistent Floor 1 → 2 → 3 unlock, replay і all-party floor access;
- uncapped XP curve, усі penalty brackets, dead-player XP exclusion і multiple level-ups;
- Tier I–III class gear, jewelry, profession resources та potion healing;
- deterministic production-engine simulator, Auto/no-potion behavior і generated reports.

## Phase 7 — First Rift

Static content розташовано в `shared/game-data/rifts`, `enemies`, `bosses` і generated catalog helpers. `first_rift` має Floor 1/2/3; Floor access зберігається у `players.rift_progress` JSONB і перевіряється для кожного party member перед START. Completed floors можна проходити повторно без lockout, keys чи energy.

Tier catalog генерує 27 profession resources, 90 class equipment pieces, 18 jewelry pieces, 3 healing potions і 111 Phase 7 recipes зі стабільними IDs. Generic Inventory/Storage/Guild Storage/Market/Trade flow не має tier-specific special cases.

Balance/progression артефакти:

- `reports/balance-report.md` — 1 260 000 seeded expeditions, 126 scenarios, 10 000 runs/scenario;
- `reports/progression-report.md` — XP curve, cumulative XP, XP/run, runs/level і penalty;
- `npm run simulate:balance` — генерує Phase 7.1 BEFORE/AFTER звіт через production combat engine; baseline Phase 7 не перезаписується.

## Phase 7.1 — Balance Pass

Party-size difficulty використовує єдиний production factory для server і simulator: 5 players = 100% HP/Attack, 4 players = 85%/91%, 3 players = 68%/84%. Scaling фіксується кількістю учасників на START і не читає class, gear, level чи profession composition. Production minimum — 3; 2-player режим лишився test/dev option.

BASIC_SMART координує potion decisions без доступу до майбутнього enemy RNG. Auto лишився random, без potions і hidden bonuses. Central recipe chances знижено до 0.25% normal / 1% elite / 4% boss після long-run supply simulation.

Повний BEFORE/AFTER, party-size, strong gear, potion, Auto, hourly economy і recipe population analysis: `reports/phase7-1-balance-report.md`. Phase 7 baseline `reports/balance-report.md` не перезаписується.

Збережено всі 238 попередніх тестів і додано 17 regression/balance tests Phase 7.1 (усього 255).

Phase 4 tests використовують той самий repository transaction contract зі shared in-memory test database, щоб швидко й детерміновано моделювати service restart та concurrency. Prisma schema/client/migration додатково перевіряються generation і TypeScript build.

`npm run test:db` виконує окремий real-PostgreSQL smoke test: створює та змінює player, закриває connection, створює новий Prisma client/service, перевіряє inventory/storage/equipment/recipes/coins/XP/ledger і видаляє тимчасовий account.

## Phase 8 — Telegram staging і playtest telemetry

Phase 8 не змінює gameplay balance або First Rift content. Telegram Mini App передає raw `initData` у HTTPS `/auth/telegram`; backend перевіряє official Telegram HMAC та freshness, зв’язує numeric Telegram user ID з persistent Account і видає opaque PostgreSQL-backed session. WebSocket `/ws` приймає тільки session token і сам визначає Account/Player. Browser dev auth працює лише за явного `ALLOW_DEV_AUTH=true`; production із dev auth не запускається.

Production/staging boot виконує Trade і paid-slot reconciliation, перевіряє PostgreSQL для `/ready` та відновлює незавершені in-memory expeditions як `SERVER_INTERRUPTED` без extraction. Structured gameplay telemetry не містить Telegram initData, credentials або private chat. Реальний звіт створюється командою:

Збережено всі 255 тестів Phase 1–7.1 і додано 16 Phase 8 auth/session/origin/admin/telemetry/recovery/WebSocket tests (усього 271).

```powershell
npm run report:playtest
```

Local development:

```powershell
Copy-Item .env.example .env
docker compose up -d
npm ci
npm run db:deploy
npm run dev
```

Production/staging використовує лише forward migrations:

```powershell
npm ci
npm run db:generate
npm run db:deploy
npm run build
npm run smoke:staging
```

Повний topology, Telegram/BotFather setup, environment variables, health/WSS checks, rollback і backup/restore checklist: `docs/STAGING.md`. Ручна narrow-width та restart перевірка: `docs/STAGING_SMOKE_CHECKLIST.md`.

Production PostgreSQL повинен мати регулярні encrypted backups і перевірені test restores. Secrets зберігаються лише в provider secret manager; `VITE_*` variables ніколи не містять bot token, session secret або database URL.

## Відомі обмеження

- Active expedition rooms не persistent: restart Node process завершує активну експедицію, позначає її `SERVER_INTERRUPTED`, не видає temporary loot і повертає гравців у City; уже committed player/economy data зберігаються.
- Dev-token доступний лише з `ALLOW_DEV_AUTH=true` у non-production; production boot із dev auth відхиляється.
- Inventory/Storage поки не мають capacity/weight limits.
- PostgreSQL integration потребує локального Docker; без запущеної БД server не може обслуговувати sessions.
- Phase 5–6 використовують один PostgreSQL advisory economy/social lock для максимально надійної взаємодії Market/Trade/Party/Guild Storage mutations; це безпечний foundation, але не фінальна high-throughput architecture.
- Active trades є persistent лише для recovery/audit; після server restart незавершені trades скасовуються, бо online presence та UI sessions in-memory.
- Presence і chat rate limiting є per-process; multi-instance fan-out/Redis навмисно відкладені.
- Guild levels, XP, buffs, buildings, treasury, territories, wars, PvP та automatic guild crafting не реалізовані.
- 3–4 player recommended groups та pure-random Auto Battle на Floor 2–3 мають низькі clear rates; це чесно зафіксовано у balance report і потребує окремого tuning рішення, а не прихованої переваги Auto.
