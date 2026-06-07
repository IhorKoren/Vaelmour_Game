# Remove Durability, Repair, and Active Gold Economy Report

## Overview
As part of Vaelmour's economy redesign, we have removed item durability loss, the equipment repair loop, and the active gameplay gold economy. The future economy will center around premium Coins linked to TON exchange. All free gameplay gold has been deactivated or retired to ensure clarity for players. Save compatibility for legacy fields (`gold`, `durability`, `maxDurability`) is preserved.

## Completed Changes

### 1. Durability and Repair Removal
- **no-op Durability Functions**: Updated `applyWeaponDurabilityLoss` and `applyArmorDurabilityLoss` in `src/game/formulas/equipment.ts` to be no-ops.
- **Bypassed Stat Penalties**: Modified `getEffectiveWeaponStats` and `getEffectiveItemStats` in `src/game/formulas/equipment.ts` to bypass durability checks, ensuring durability never penalties item stats.
- **Omitted Cost**: Set `getRepairCost` to always return `0`.
- **no-op Repair Transaction**: Made `repairEquippedItem` in `src/game/formulas/equipment.ts` return the hero unchanged.
- **Removed UI Elements**: Cleaned up the repair buttons and durability warnings/displays from `CharacterScreen.tsx` and durability labels from `InventoryScreen.tsx`.

### 2. Gold Economy Removal
- **Starting Gold**: Set starting gold to `0` in `src/game/createInitialHero.ts`.
- **Enemy Gold Rewards**: Updated `getEnemyGoldReward` in `src/game/formulas/rewards.ts` to always return `0`.
- **Combat Victory Rewards**: Modified `calculateVictoryRewards` in `src/features/combat/services/combatRewards.ts` to award `0` gold. Removed gold mentions from victory log messages.
- **Quest Gold Rewards**: Set all gold rewards in static quest definitions and quest reward estimations (`src/data/quests.ts` and `src/game/formulas/quests.ts`) to `0`.
- **Omitted Gold Displays**: Completely hid or removed gold indicators across the UI (status bar, victory panels, quest rewards, and character screens), avoiding "0 gold" messages.

### 3. Crafting Adjustments
- **Zero Recipe Gold Cost**: Updated all recipes in `src/data/equipmentCatalog.ts` to require `0` gold.
- **Bypassed Crafting Validation**: Modified `getCraftingBlockedReason` and `executeCraftTransaction` in `src/features/crafting/craftingHelpers.ts` to never check or deduct gold.
- **Removed Crafting Rerolls**: Removed gold-based affix rerolls and cost displays from the UI in `InventoryScreen.tsx`.

### 4. Compatibility and Admin panel
- **Saves Normalization**: The save system (`saveSystem.ts` and sanitizers) correctly normalizes state properties, keeping old files with `gold` or `durability` fields safe from crashes.
- **Admin Panel Control Labeling**: Deprecated active gold controls in `AdminPanel.tsx` by labeling them as legacy.

## Verification & Checks
All tasks are validated and compile cleanly:
- `npm run validate:data` (Success)
- `npm run typecheck` (Success)
- `npm run lint` (Success)
- `npm run test` (Success, 190/190 passing tests)
- `npm run build` (Success)
- `npm run balance:audit` (Success)
