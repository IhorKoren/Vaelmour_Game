# Item Required Level And Chest Level Rules Report

## Exact equip rule

- A hero can equip an item only when `hero.level >= item.requiredLevel`.
- If `requiredLevel` is not explicitly present, the runtime derives it from `generatedItem.level`, then `item.level`, then `item.tier`, with a minimum of `1` and maximum of `30`.
- If the hero level is too low, the item stays in inventory, the equipped slot does not change, and the equip action is blocked.

## UI behavior

- `InventoryScreen` now shows `Рівень предмета: X` in the selected item panel.
- If the hero level is too low, the inventory panel also shows:
  - `Потрібен рівень: X`
  - `Ваш рівень: Y`
- The inventory equip button is disabled for blocked items and its label changes to `Потрібен рівень`.
- `CharacterScreen` now shows `Рівень предмета: X` on the selected equipped-item panel.
- The character slot replacement list now shows the required level, displays the blocked message for too-high items, and disables the equip button there too.
- Durability text was not restored.

## Future chest level rule

- Added `getChestEligibleEquipmentLevels(heroLevel)`.
- Behavior:
  - hero 1 -> `[1, 3]`
  - hero 4 -> `[3, 6]`
  - hero 16 -> `[15, 18]`
  - hero 29 -> `[27, 30]`
  - hero 30 -> `[30]`
- Rule meaning:
  - use the hero's current equipment tier
  - optionally include the next tier only when it is within `heroLevel + 3`
  - never go above level `30`

## XP relic design decision

- Runtime XP relic behavior was intentionally not implemented in this task.
- No new relic drops, no chest integration, no XP formula changes, and no stacking behavior were added to live gameplay.
- Design decision for the next chest/relic task:
  - `relic_ring_wanderer_xp`: ring, level 1, fixed `+20%` XP, no durability, no reroll, unique equipped
  - `relic_amulet_forgotten_path_xp`: amulet, level 1, fixed `+20%` XP, no durability, no reroll, unique equipped
  - maximum combined XP bonus from these relics should be capped at `40%`
  - identical XP relic rings should not stack

## Implemented now

- Added central helper logic in `src/game/formulas/equipmentRules.ts`.
- Enforced level checks in `equipInventoryItem`.
- Updated inventory and character UI to reflect blocked equip states and required levels.
- Added tests for equip restriction, chest helper behavior, required-level derivation, and UI rendering.

## Postponed until chest implementation

- Chest opening changes
- Paid chest logic
- TON or Coins interactions
- Relic drops and runtime relic effects
- XP relic stacking enforcement in progression formulas

## Tests added or updated

- Added `src/game/formulas/equipmentRules.test.ts`
- Added `src/features/inventory/equipmentLevelUi.test.tsx`
- Existing display helper test coverage still guards against durability text regressions

## Validation results

- `npm run validate:data` passed with pre-existing data warnings only
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed
- `npm run build` passed
- `npm run balance:audit` passed

## Remaining warnings

- `validate:data` still reports pre-existing crafting and spawn-pool warnings unrelated to this change
- `vite build` still reports pre-existing large chunk warnings for `screen-shop` and `game-core`
