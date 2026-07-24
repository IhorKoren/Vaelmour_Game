# План переходу Racing_Game до 2.5D

## Межі та архітектурний принцип

Це поетапна перебудова наявного прототипу, а не нова гра. Канонічними
залишаються координати `worldX/worldY`. Фізика, multiplayer, checkpoints/laps,
майбутні Ghost і Track Editor не повинні залежати від екранної проєкції.

Цільовий потік:

```text
2D world state / physics
        ↓
world-space camera
        ↓
pure 2.5D projection
        ↓
ground renderer + object renderer
        ↓
React HUD
```

Phase 1 навмисно додає лише чисту математику й тести. Вона не змінює вид гри.
Інтеграція починається у Phase 2.

## Аудит поточної архітектури

### Знайдені системи

| Система | Поточна реалізація | Рішення |
| --- | --- | --- |
| Bootstrap/game loop | `src/main.tsx`, `src/client/App.tsx`, Phaser loop у `RacePrototypeScene.update()` | Залишити |
| Renderer | Phaser display list; процедурний track у `PrototypeTrack.draw()`; WebGL mesh post-process у `PseudoPerspectiveRenderer` | Поступово розділити ground/object layers |
| Camera | `RotatingFollowCamera`: rotation, position smoothing, speed look-ahead, portrait anchor | Переробити у Phase 2, зберігши runtime tuning |
| Поточна pseudo-3D | `PseudoPerspectiveRenderer`: render-to-texture + 128 mesh strips, доступний лише у WebGL | Замінити поступово; не використовувати як physics/network coordinate system |
| Physics | Локальна arcade-модель у `PlayerCar.update()` з velocity, grip, lateral grip, drag та offroad factors | Зберегти як базу; доповнити brake/reverse пізніше |
| Track data | Закритий Phaser spline з hard-coded control points; sampled centerline, checkpoints і `isOnTrack()` | Винести дані/geometry від rendering у наступних фазах |
| Track rendering | Один великий процедурний метод: grass, sand, asphalt, curbs, lines, guardrails, props, start line | Потребує декомпозиції, але не у Phase 1 |
| Track Editor | Відсутній | Нова система з top-down editing |
| Input | `SteeringInput`: touch-drag у нижній частині viewport; постійне автоматичне прискорення | Розширити без втрати touch steering |
| Multiplayer client | `MultiplayerClient`: WebSocket, 20 Hz send, ping, reconnect, typed parser | Залишити протокол без змін |
| WebSocket server | `server/multiplayerServer.ts`: одна room, relay, rate/size limits, snapshots | Залишити |
| Remote interpolation | `RemoteCar`: buffer до 32 snapshots, world-space position і shortest-angle interpolation | Залишити; проєктувати лише після interpolation |
| Car collisions | Між автомобілями відсутні; barrier collisions теж відсутні | Відсутність car collisions зберегти; barrier collisions додати окремо |
| Checkpoints/laps | У `RacePrototypeScene`, proximity spheres по sampled centerline | Зберегти world-space; пізніше зробити directional crossing |
| Car rendering | Процедурний `CarVisual`, спільний для local/remote, з shadow усередині container | Розділити shadow/body; підготувати directional sprites |
| Effects | World-space skid marks і dust у `DrivingEffects` | Зберегти дані, проєктувати під час render |
| Ghost | Відсутній | Нова optional world-space система |
| HUD | React overlay: speed, lap, current/best time, debug | Зберегти; додати minimap/countdown пізніше |
| Runtime tuning | React `DebugPanel` + mutable config refs | Розширити projection/camera параметрами |
| Audio | Відсутнє | Нова система після головного visual pass |
| Mobile shell | Fixed 450×800 Phaser canvas, FIT scaling, CSS safe areas, touch input | Зберегти й профілювати |

### Що можна залишити без змін

- Shared multiplayer protocol та server relay.
- World-space remote snapshot buffer й shortest-path angle interpolation.
- React/Phaser lifecycle у `App`/`createGame`.
- Основні velocity/grip/offroad рівняння як стартову physics model.
- Touch drag steering і CSS safe-area shell.
- Telemetry callback та базовий HUD.
- Procedural source geometry траси як тимчасове джерело centerline.

### Місця, що потребують refactor

- `RacePrototypeScene` зараз координує physics, race state, networking, camera й
  rendering; інтеграцію треба розносити малими кроками.
- `PrototypeTrack` змішує track data, spatial queries і всі drawing layers.
- `DrivingConfig` змішує physics і camera/perspective tuning.
- `PseudoPerspectiveRenderer` деформує вже зведену сцену, тому сплющує ground,
  cars і props разом, залежить від WebGL і ускладнює правильний render order.
- `RotatingFollowCamera` завжди обертає світ; це суперечить default
  `REFERENCE_FIXED`.
- Shadow є частиною car container, тому не може бути справжнім ground layer.
- Guardrails/props — лише graphics без серіалізованих даних і collision flags.
- `isOnTrack()` виконує лінійний пошук усіх 961 samples щокадру.

### Виявлені відсутні можливості

У поточному repository немає Track Editor, Ghost, barrier/guardrail collision,
car config presets, brake/reverse, minimap, countdown і audio. Їх треба додавати
як сумісні модулі, а не шукати неіснуючі integration points.

## Phase 0 — Repository audit і план

**Мета.** Зафіксувати реальну архітектуру, межі world/render state і порядок
міграції.

**Файли.** Новий `IMPLEMENTATION_PLAN_2_5D.md`.

**Залежності.** Немає.

**Ризики.** Помилково вважати hard-coded track editor data або mesh warp
довгостроковою projection API.

**Готовність.** Усі наявні та відсутні системи відображені; для кожної фази є
точні точки зміни, перевірки й regression boundaries.

**Перевірка.** Звірити план з усіма файлами repository; baseline:
`npm run typecheck`, `npm run lint`, `npm run test:server`,
`npm run build`, `npm run build:server`.

**Не повинно зламатися.** Жоден runtime файл не змінюється.

## Phase 1 — Pure 2.5D projection abstraction

**Мета.** Створити Phaser-independent affine/orthographic-like projection:
Y compression, projected direction, pseudo-height і точне inverse mapping.
Runtime поведінка гри поки не змінюється.

**Файли.**

- Новий `src/client/game/rendering/projection.ts`.
- Новий `src/client/game/rendering/projection.test.ts`.
- `package.json`: окремий projection test і загальна test-команда.

**Нові API.**

- `projectWorldPoint()`
- `projectWorldVector()`
- `projectWorldAngle()`
- `projectHeight()`
- `worldToScreen()`
- `screenToWorld()`
- typed camera/projection/point structures і defaults (`depthScale = 0.62`)

**Залежності.** Лише TypeScript/JavaScript math; жодної залежності від Phaser,
DOM або renderer.

**Ризики.** Неузгоджені angle conventions Phaser (`0` sprite up) і математичної
формули; поганий inverse при нульовому zoom/depth scale; випадкове змішування
screen coordinates у world state.

**Готовність.**

- Camera origin проєктується в заданий screen center.
- World X масштабується `zoom`, world Y — `zoom * depthScale`.
- Angle відповідає проєкції direction vector.
- Height зміщує лише screen Y.
- `screenToWorld(worldToScreen(point))` повертає початкові X/Y у tolerance.
- Invalid non-finite/non-positive scale inputs fail fast.
- Новий модуль ніде не підключений до gameplay.

**Перевірка.** Unit tests для center, translation, zoom, depth compression,
angles по осях/діагоналі, height, round trip, input validation. Потім усі
baseline checks і production/server builds.

**Не повинно зламатися.** Поточна rotating camera, mesh perspective, physics,
track, input, multiplayer protocol/server, remote interpolation, laps і HUD.

## Phase 2 — Camera modes і projection integration

**Мета.** Зробити `REFERENCE_FIXED` default: fixed world orientation,
smoothed position follow, car біля center, look-ahead 0. Зберегти
`FOLLOW_ROTATION` для A/B тестів.

**Файли.**

- `src/client/game/camera/RotatingFollowCamera.ts` — адаптувати або замінити
  сумісним `FollowCamera`.
- `src/client/game/camera/PseudoPerspectiveRenderer.ts` — прибрати з default
  path після parity check, залишити тимчасовий fallback до завершення Phase 3.
- `src/client/game/config/drivingConfig.ts` — винести/додати camera mode,
  `depthScale`, position lerp, rotation toggle, look-ahead.
- `src/client/game/scenes/RacePrototypeScene.ts`.
- `src/client/components/DebugPanel.tsx`.

**Нові модулі.** За потреби `camera/CameraState.ts` і
`config/renderingConfig.ts`, щоб physics tuning не залежав від projection.

**Залежності.** Phase 1.

**Ризики.** Phaser camera transform може двічі застосувати zoom/rotation;
portrait anchor може змінити framing; Canvas fallback відрізнятиметься від
WebGL.

**Готовність.** Fixed mode не обертає world, depth scale runtime-tunable
0.55–0.68, default 0.62; follow smoothing стабільний при різному FPS; alternate
mode доступний без зміни physics/network.

**Перевірка.** Projection tests; ручний A/B обох modes у desktop і 9:16; resize,
Canvas/WebGL smoke test; повний validation suite.

**Не повинно зламатися.** World coordinates, multiplayer payload, checkpoint
logic, remote interpolation, touch steering і tuning persistence for session.

### Phase 2 implementation note

- `FollowCamera` тепер має explicit modes. `REFERENCE_FIXED` є default, тримає
  Phaser camera rotation на `0`, використовує frame-rate-independent position
  lerp і нульовий reference look-ahead. `FOLLOW_ROTATION` зберігає попередні
  rotation, portrait anchor і speed look-ahead defaults.
- Camera tuning винесено з physics `DrivingConfig` у `cameraConfig.ts`.
  Projection/legacy mesh tuning знаходиться у `projectionConfig.ts`;
  `depthScale` default — `0.62`, `zoom` — `1`.
- `FollowCamera.getProjectionCamera()` та `projectWorldPoint()` є integration
  boundary для layer renderer Phase 3. Track поки лишається у Phaser top-down
  display list, тому depth compression навмисно ще не застосовується до road.
- Legacy `PseudoPerspectiveRenderer` тепер є compatibility effect лише для
  `FOLLOW_ROTATION`. У `REFERENCE_FIXED` він вимкнений, що виключає подвійну
  deformation перед layer-based projection Phase 3.
- `angleConvention.ts` централізує перехід між car/Phaser heading
  (`0 = up`) і projection angle (`0 = +X`). Physics/network headings не
  конвертуються й залишаються world-space.

## Phase 3 — Projected track і terrain layers

**Мета.** Рендерити terrain/road/markings через projection API без
post-processing всього Canvas.

**Файли.**

- `src/client/game/track/PrototypeTrack.ts` — відділити data/query від drawing.
- `src/client/game/scenes/RacePrototypeScene.ts`.
- `src/client/game/camera/PseudoPerspectiveRenderer.ts` — видалити з active path
  після досягнення parity.

**Нові модулі.** `track/TrackGeometry.ts`, `rendering/TrackRenderer.ts`,
`rendering/SurfaceTextures.ts`, `rendering/RenderLayers.ts`.

**Залежності.** Phases 1–2.

**Ризики.** Великі projected paths і procedural texture redraw можуть бути
дорогими; seams на closed spline; culling може сховати видимі segments.

**Готовність.** Grass, sand, asphalt і markings мають окремі layers; asphalt
та terrain textured; surface physics читає ту саму geometry, не pixels.

**Перевірка.** Visual snapshots на straight/corner/start; resize; FPS/memory на
portrait phone; track/offroad regression.

**Не повинно зламатися.** Centerline, spawn, checkpoints, lap count і server
state.

### Phase 3 implementation note

- `PrototypeTrack` тепер зберігає лише source-of-truth world geometry,
  checkpoints, sand zone data, normal queries, spawn і `isOnTrack()`. Physics,
  laps і network координати не проектуються.
- `ProjectedTrackRenderer` читає ту саму centerline/road width/sand data та
  щокадру будує лише видимі camera-relative ground quads через Phase 1 API.
  Окрема ground camera рендериться позаду main object camera, тому cars не
  стискаються глобальним `scaleY`.
- Projected layers у `REFERENCE_FIXED`: world-stable grass detail, sand
  polygons, layered asphalt strip, asphalt marks, thin boundary strips і
  checker start line. Runtime `depthScale` змінює всі ground vertices без
  reload; `GROUND_PROJECTION=0` вмикає flat legacy comparison.
- Обрано compatibility strategy A: `REFERENCE_FIXED` використовує projected
  ground, а `FOLLOW_ROTATION` — `LegacyTrackRenderer` плюс існуючий
  `PseudoPerspectiveRenderer`. Legacy renderer винесений з track data class,
  але поки збережений для A/B і містить старі curbs/trackside props.
- Renderer culls world segments за inverse-projected viewport bounds. Geometry
  helpers не мутують centerline; поточна кількість allocations прийнятна для
  correctness pass, але reusable projected buffers залишаються optimization
  risk для Phase 11.

## Phase 4 — Car renderer і ground shadow

**Мета.** Проєктувати позицію та direction car, зберігаючи пропорції sprite;
винести soft shadow у ground layer; підготувати renderer до 16/32 directions.

**Файли.** `entities/CarVisual.ts`, `entities/PlayerCar.ts`,
`entities/RemoteCar.ts`, `scenes/RacePrototypeScene.ts`.

**Нові модулі.** `rendering/CarRenderer.ts`,
`rendering/DirectionalSprite.ts`, optional asset manifest.

**Залежності.** Phases 1–3.

**Ризики.** Поточний sprite-up convention відрізняється від mathematical angle;
remote alpha/nameplates; shadow depth order.

**Готовність.** Local/remote position та angle проходять через projection після
world update/interpolation; body не сплющений по Y; shadow opacity 0.20–0.30 і
має малий offset; fallback procedural visual працює без sprite sheet.

**Перевірка.** 8 cardinal/intercardinal headings, local/remote overlap без
collision, shadow ordering, Canvas/WebGL, multiplayer two-client smoke test.

**Не повинно зламатися.** `PlayerCar` physics entity, snapshot schema,
world-space interpolation і remote transparency.

## Phase 5 — Curbs, barriers, guardrails і pseudo-height

**Мета.** Alternating red/white curb segments та pseudo-3D track props із
per-object/per-segment `collision`.

**Файли.** Track data/renderer з Phase 3, `PrototypeTrack.ts` migration fallback,
`RacePrototypeScene.ts`.

**Нові модулі.** `track/TrackObject.ts`, `rendering/PropRenderer.ts`,
`physics/BarrierCollision.ts`, spatial index для collision candidates.

**Залежності.** Phases 1–4.

**Ризики.** Tunneling на швидкості; collision normals біля spline joints;
неправильний depth sort tall props.

**Готовність.** Curb config підтримує enabled/side/segmentLength; кожен barrier
segment має `collision: boolean`; collision geometry лишається world-space;
height впливає лише на visual.

**Перевірка.** Unit tests collision on/off і projected height; manual impacts з
обох сторін; no collision між cars.

**Не повинно зламатися.** Legacy track без нових fields завантажується через
defaults; offroad/checkpoints/network не використовують projected geometry.

## Phase 6 — Track Editor compatibility та extensions

**Мета.** Додати зручний true top-down editor для centerline, surfaces, props,
curbs, checkpoints/start і collision toggles.

**Файли.** `App.tsx`, scene registration, track data modules.

**Нові модулі.** `editor/TrackEditorScene.ts`, editor UI/components,
`track/TrackSchema.ts`, serialize/validate/migrate utilities.

**Залежності.** Stable track schema з Phases 3 і 5.

**Ризики.** Несумісні schema migrations; invalid/self-intersecting paths;
editing надмірно великих sampled arrays.

**Готовність.** Editor працює top-down незалежно від gameplay projection;
round-trip export/import; legacy hard-coded prototype має migration/fallback;
collision toggle доступний для кожного barrier/guardrail.

**Перевірка.** Schema tests, legacy fixture migration, editor round trip,
playtest exported track.

**Не повинно зламатися.** Existing prototype track, runtime play scene та
server protocol.

## Phase 7 — Physics tuning, car configs, brake/reverse

**Мета.** Зберегти arcade velocity model, додати реальне brake-then-reverse
керування і мінімальний typed car config.

**Файли.** `entities/PlayerCar.ts`, `input/SteeringInput.ts` (або новий
`DrivingInput`), `config/drivingConfig.ts`, `DebugPanel.tsx`.

**Нові модулі.** `config/carConfigs.ts`; pure physics helpers/tests за потреби.

**Залежності.** Stable camera framing з Phase 2 і barrier collision з Phase 5.

**Ризики.** Автоматичне acceleration зараз закладене у `PlayerCar`; touch UI
потребує окремих throttle/brake zones; reverse steering convention.

**Готовність.** Forward input accelerates; brake input спочатку гальмує і лише
біля stop вмикає reverse; high-speed steering слабшає; є невеликий lateral slip;
offroad суттєво обмежує speed/acceleration.

**Перевірка.** Deterministic physics tests на fixed dt, 30/60/120 FPS comparison,
touch playtest, runtime tuning bounds.

**Не повинно зламатися.** Projection не входить у physics; snapshot fields
лишаються `x/y/rotation/speed/velocityX/velocityY`.

## Phase 8 — Multiplayer і Ghost regression

**Мета.** Підтвердити world-space networking і додати optional world-space
Ghost, що легко вимикається у multiplayer.

**Файли.** `RacePrototypeScene.ts`, multiplayer client/remote car лише для
integration tests; shared protocol без зміни, якщо не виникне доведена потреба.

**Нові модулі.** `ghost/GhostRecorder.ts`, `ghost/GhostPlayback.ts`,
`rendering/GhostRenderer.ts`.

**Залежності.** Phases 1–7.

**Ризики.** Different clocks у snapshots/ghost; buffer extrapolation; memory
для довгих записів.

**Готовність.** Ghost samples `x/y/heading/timestamp`, interpolates у world і
лише потім projects; no collision/physics; toggle on/off; multiplayer може
disable ghost. Remote cars також interpolate-before-project.

**Перевірка.** Ghost interpolation/serialization tests; server suite; two-client
network latency test; projection mode switch під час playback.

**Не повинно зламатися.** Network protocol, server authority model, reconnect,
late join і відсутність car-to-car collision.

## Phase 9 — HUD, generated minimap і start sequence

**Мета.** Мінімалістичний portrait HUD, generated minimap і arcade countdown
`3 2 1 START!`.

**Файли.** `components/Hud.tsx`, `styles.css`, telemetry/race state у
`RacePrototypeScene.ts`.

**Нові модулі.** `components/Minimap.tsx` або Phaser HUD renderer,
`race/StartSequence.ts`.

**Залежності.** Stable track geometry і multiplayer player positions.

**Ризики.** React update rate; HUD safe areas; start synchronization не можна
видавати за server-authoritative без protocol design.

**Готовність.** Minimap генерується з centerline, показує local/optional remote
markers; countdown блокує throttle локально; HUD не перекриває значну частину
9:16 viewport.

**Перевірка.** Component/layout tests, 320–450 px widths, Telegram safe-area
manual test, minimap mapping unit tests.

**Не повинно зламатися.** Race telemetry cadence, touch area і networking.

## Phase 10 — Engine audio foundation

**Мета.** Додати unlock-safe mobile audio service з dynamic engine pitch і
розширюваними channels.

**Файли.** `RacePrototypeScene.ts` для telemetry events/input unlock.

**Нові модулі.** `audio/EngineAudio.ts`, `audio/AudioMixer.ts`, audio assets.

**Залежності.** Stable throttle/speed signals з Phase 7.

**Ризики.** Browser autoplay policy, Telegram lifecycle, loop seams, CPU/battery.

**Готовність.** `playbackRate = minPitch + normalizedRPM * pitchRange`;
start/stop/resume без leaks; API має channels для low/high RPM, squeal, skid,
offroad, curb та impact без обов'язкової реалізації всіх assets.

**Перевірка.** Gesture unlock, background/foreground, mute, iOS/Android Telegram
smoke tests, no-console-error run без audio support.

**Не повинно зламатися.** Main loop і rendering не блокуються audio loading.

## Phase 11 — Portrait/mobile polish і performance

**Мета.** Завершити framing, safe areas, touch ergonomics і стабільний frame
budget на mobile/Telegram.

**Файли.** `createGame.ts`, `styles.css`, input/HUD/camera/renderers.

**Нові модулі.** Visibility/culling helpers, optional quality tiers і perf HUD.

**Залежності.** Усі попередні visual/gameplay фази.

**Ризики.** Великий Phaser bundle, high-DPI fill rate, procedural geometry,
Telegram viewport resize/keyboard/lifecycle.

**Готовність.** Playable portrait framing; safe-area correct; touch controls не
конфліктують з Telegram gestures; bounded objects/effects; target device frame
time задокументований; resize/orientation не гублять state.

**Перевірка.** Production build size, Chrome performance trace, low/mid phone,
Telegram WebApp, reconnect after background, 30-minute memory soak.

**Не повинно зламатися.** Desktop play, alternate camera mode, editor top-down,
multiplayer reconnect і deterministic world systems.

## Validation gate після кожної implementation phase

Обов'язково:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run build:server
```

Додатково запускаються phase-specific unit/integration/manual checks. Кожна
логічна фаза отримує окремий commit, щоб projection, camera, physics, HUD,
audio та editor можна було revert незалежно.
