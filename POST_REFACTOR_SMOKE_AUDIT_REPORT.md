# Post-Refactor Smoke Audit Report

## Inspected files

### Save / Load

- `src/game/save/saveSystem.ts`
- `src/game/save/cloudSaveSanitizer.ts`
- `src/telegram/playerCloudSave.ts`
- `netlify/functions/getPlayerState.ts`
- `netlify/functions/savePlayerState.ts`

### Combat

- `src/features/combat/CombatScreen.tsx`
- `src/features/combat/hooks/useCombatSession.ts`
- `src/features/combat/services/combatEnemyService.ts`
- `src/features/combat/services/combatLogService.ts`
- `src/features/combat/services/combatRewards.ts`
- `src/features/combat/services/combatTimerService.ts`
- `src/app/regenRules.ts`
- `src/app/AppShell.tsx`

### Inventory / Equipment

- `src/features/inventory/InventoryScreen.tsx`
- `src/features/inventory/components/InventoryTabBar.tsx`
- `src/data/resolvedItems.ts`

### Crafting

- `src/features/crafting/CraftingScreen.tsx`
- `src/data/resolvedItems.ts`
- `src/data/recipes.ts`
- `src/data/recipeDrops.ts`

### Data Validation

- `scripts/validateData.mjs`
- `src/data/*`
- `src/data/generated/*`

### Telegram Notification

- `src/telegram/fullHealthNotificationRules.ts`
- `src/telegram/telegramNotifications.ts`
- `netlify/functions/sendFullHealthNotification.ts`
- `netlify.toml`
- `tests/netlify/sendFullHealthNotification.test.ts`

## Issues found

No clear runtime regression was found in the inspected gameplay and persistence flows during this static smoke audit.

No code changes were required.

## Fixes made

None.

## Systems confirmed working

### Save / Load

- Local save initialization still uses `loadGame()` with `normalizeHeroState()` and offline regen application.
- Old-save compatibility remains in place:
  - equipment slot migration
  - `ring` -> `ring1` compatibility
  - durability/affix map migration
  - quest initialization and quest target migration
  - defeated boss fallback
- Hero HP and max HP are normalized on local load and offline regen paths.
- Cloud save load still requires Telegram `initData`, fetches from the Netlify function, and AppShell applies offline regen before restoring state.
- Cloud save write still debounces, supports immediate flush, and ignores stale saves when the backend reports `staleIgnored`.
- Server-side cloud save sanitization preserves inventory, equipment, generated items, selected location, recipe knowledge, durability, and affixes while clamping invalid numeric/input ranges.
- Selected location is preserved across cloud load/save.
- Quest state preservation still exists through hero JSON round-tripping and local normalization.

### Combat

- Normal hunt start is intact through `startHunting()`.
- Boss fight start is intact through `startBossFight()` when a location boss exists.
- Hero and enemy attack timers still schedule recursively from attack speed and respect the shared combat interval multiplier.
- Victory still applies rewards through `processVictoryRewards()` and `calculateVictoryRewards()`.
- Duplicate reward prevention is still guarded by `rewardGrantedRef`.
- Auto-next enemy still occurs automatically after victory.
- Defeat still retreats the hero to camp with `1 HP` rather than leaving a deadlocked state.
- Combat logs still append/prepend in bounded length and are surfaced in the combat UI.
- Weapon and armor durability loss still happens during hero and enemy actions.
- Passive HP regen remains blocked during active combat through `shouldApplyPassiveHealthRegen(..., isFighting)`.
- HP regen resumes after combat because AppShell only blocks passive/offline regen while `isFighting` is true.

### Inventory / Equipment

- Inventory screen still resolves both static items and generated equipment through `resolvedItems`.
- Item selection logic remains keyed by stack identity, including durability/affix/reroll distinctions.
- Equip/unequip still routes through the existing equipment formulas.
- Weapons, armor, shields, rings, amulets, and generated equipment still have resolution/display paths.
- Rarity color styling remains present in inventory detail and grid rendering.
- Item stat display and affix display paths remain intact.
- Comparison panel logic is still present for equippable items.

### Crafting

- Crafting screen still opens from the inventory forge tab.
- Learned recipe filtering and recipe tab filtering still work logically.
- Material requirement display still compares inventory quantities against recipe costs.
- Output item names still resolve through display helpers and result resolution helpers.
- Generated/static item resolution still works through the result resolver chain.
- Crafting still guards against unresolved result IDs and missing requirements before mutating hero state.

### Data Validation

- `npm run validate:data` still checks core generated data integrity:
  - unique ids
  - location -> enemy references
  - location -> material references
  - enemy -> location references
  - recipe output references
  - recipe material references
  - rarity validation
  - spawn pool location references
- No broken generated JSON references were surfaced by the current validation script.

### Telegram Notification

- Full HP notification still uses explicit below-full -> full transition rules.
- Eligibility still resets after damage through the `reset_cycle` branch.
- Notification remains blocked during combat.
- Frontend still sends Telegram `initData` when available.
- Backend still validates Telegram `initData` via the shared auth utility.
- No unsafe raw `clientUserId` fallback was reintroduced.
- The function still returns structured JSON with `success`, `skipped`, `reason`, and `messageSent`.
- The Netlify route still correctly maps `/api/telegram/full-health-notification` to `sendFullHealthNotification`.
- No `.test.ts` files remain inside `netlify/functions`.

## Remaining risks

- This was a static audit only. It did not include interactive browser playthroughs for hunt, boss, crafting, inventory compare, or Telegram delivery UI.
- `validate:data` covers core generated references well, but it does not currently validate every adjacent generated/support dataset with the same depth. In particular, secondary datasets such as recipe-drop mapping families, bosses, and split equipment catalogs are more lightly covered than the main locations/enemies/items/recipes path.
- Combat auto-next is still unconditional after victory; that matches the current code path, but there is no explicit user-facing toggle in the audited files.
- Cloud save correctness still depends on valid Telegram WebApp context in production; missing Telegram context correctly skips cloud load/save, but that means non-Telegram launch contexts still do not exercise the cloud path.

## Validation command results

- `npm run validate:data` ✅
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅ `104` passing tests
- `npm run build` ✅
