# Перший Розлом — Phase 5

Mobile-first Telegram WebApp PvE vertical slice. Phase 5 додає persistent Market, безпечний Direct Trade і Paid Party Slots поверх PostgreSQL foundation Phase 4, не змінюючи server-authoritative combat, crafting та loot flow.

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

Client-provided `playerId`, coins, XP, inventory, stats і rewards не використовуються як source of truth. Dev-token проходить HMAC-SHA256 із `DEV_AUTH_SECRET`; цей adapter можна пізніше замінити Telegram auth без зміни економічних таблиць.

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

## Перевірки

```powershell
npm test
npm run test:db       # real PostgreSQL restart/persistence smoke test
npm run lint
npm run build
```

Збережено всі 70 тестів Phase 1–4 і додано 51 Phase 5 test (усього 121):

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

Phase 4 tests використовують той самий repository transaction contract зі shared in-memory test database, щоб швидко й детерміновано моделювати service restart та concurrency. Prisma schema/client/migration додатково перевіряються generation і TypeScript build.

`npm run test:db` виконує окремий real-PostgreSQL smoke test: створює та змінює player, закриває connection, створює новий Prisma client/service, перевіряє inventory/storage/equipment/recipes/coins/XP/ledger і видаляє тимчасовий account.

## Відомі обмеження

- Active expedition rooms не persistent: restart Node process завершує активну експедицію, але вже committed player/economy data зберігаються.
- Dev-token — development authentication, не production security і не Telegram auth.
- Inventory/Storage поки не мають capacity/weight limits.
- PostgreSQL integration потребує локального Docker; без запущеної БД server не може обслуговувати sessions.
- Phase 5 використовує один PostgreSQL advisory economy lock для максимально надійної взаємодії Market/Trade/Party/Phase 4 mutations; це безпечний foundation, але не фінальна high-throughput auction architecture.
- Active trades є persistent лише для recovery/audit; після server restart незавершені trades скасовуються, бо online presence та UI sessions in-memory.
- Phase 6 systems (Guilds, Redis scaling, persistent combat rooms тощо) навмисно не реалізовані.
