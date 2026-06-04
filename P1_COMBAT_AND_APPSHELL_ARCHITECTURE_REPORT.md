# P1 Combat And AppShell Architecture Report

## Before/After Structure

### Before

- Passive HP regen in [src/app/AppShell.tsx](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\app\AppShell.tsx) still healed during active combat.
- Combat log list merging and encounter enemy selection logic were embedded in combat flow code.
- Timeout cleanup used repeated inline `clearTimeout` patterns across combat state transitions.

### After

- Passive/global regen rules are formalized in [src/app/regenRules.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\app\regenRules.ts) and enforced from `AppShell`.
- Encounter spawning/list handling now has dedicated service helpers:
  - [src/features/combat/services/combatEnemyService.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\features\combat\services\combatEnemyService.ts)
  - [src/features/combat/services/combatLogService.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\features\combat\services\combatLogService.ts)
  - [src/features/combat/services/combatTimerService.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\features\combat\services\combatTimerService.ts)
- `useCombatSession` now uses shared timeout clearing and shared combat-log prepend handling instead of duplicating those mechanics inline.

## Which Files Were Split

- Added `src/app/regenRules.ts`
- Added `src/features/combat/services/combatEnemyService.ts`
- Added `src/features/combat/services/combatLogService.ts`
- Added `src/features/combat/services/combatTimerService.ts`

## What Combat Responsibilities Were Moved

- Passive HP regen decision logic moved out of `AppShell` render/effect code into `regenRules.ts`
- Encounter enemy creation moved into `combatEnemyService.ts`
- Combat log array merging moved into `combatLogService.ts`
- Timeout clearing utility moved into `combatTimerService.ts`

## How Timers Are Now Handled

- Shared `clearCombatTimeout` is now used for:
  - location change cleanup
  - unmount cleanup
  - retreat
  - return to camp
  - defeat fallback cleanup
- This reduces repeated inline timeout clearing and makes the cleanup intent easier to follow.

## How HP Regen Now Behaves

- Passive/global regen is now explicitly blocked during active combat.
- Offline/focus reconciliation behavior remains separate.
- This matches the safer P1 recommendation that world-level regen should not silently heal during an active fight unless combat formulas explicitly do so.

## What Tests Were Added Or Updated

- Added [src/app/regenRules.test.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\app\regenRules.test.ts)
- Added [src/features/combat/services/combatLogService.test.ts](C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\features\combat\services\combatLogService.test.ts)

## Validation Command Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅
