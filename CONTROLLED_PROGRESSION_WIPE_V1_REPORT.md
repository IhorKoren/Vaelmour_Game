# Controlled Progression Wipe V1 Report

Date: 2026-06-07
Task: `CONTROLLED_PROGRESSION_WIPE_V1`
Wipe ID: `progression_wipe_2026_06_07_v1`

## Wipe Strategy
- Added a versioned progression wipe constant: `GAME_WIPE_ID`.
- Added optional `wipeId` to `HeroState`.
- New heroes are stamped with the current wipe id.
- Old saves are not deleted as player records.
- Instead, gameplay progress is soft-reset when a loaded hero is missing the current wipe id or has an outdated wipe id.
- The reset path rebuilds a fresh level 1 hero while preserving hero-facing identity fields already stored in the hero payload (`id`, `name`, `nameSource`).

## What Is Reset
- hero level
- XP
- gold
- HP
- inventory
- equipment
- known recipes
- quests
- selected location
- crafting materials
- generated items
- old progression state carried by outdated/missing `wipeId`

## What Is Preserved
- player id / hero id
- player identity records stored outside hero progression
- Telegram user id
- Telegram username / first name / last name
- admin / ban metadata
- current player record row in cloud storage

## Local Save Behavior
- `loadGame()` now checks whether the stored hero is outdated for the current wipe.
- If `wipeId` is missing or outdated:
  - the hero is replaced with a fresh `createInitialHero()` state
  - preserved identity fields are copied onto the reset hero
  - the reset save is immediately written back to local storage
- If `wipeId` matches:
  - current progress is preserved and normalized normally

## Cloud Save Behavior
- Cloud save payloads still load through the existing Telegram/Supabase path.
- `AppShell` now checks the raw cloud hero with the same wipe rule before restoring progress.
- If the cloud hero is missing the current wipe id or has an outdated id:
  - cloud gameplay progress is reset to a fresh hero
  - selected location is reset to the starting location
  - the reset hero is immediately forced back to cloud storage
- This prevents old Supabase progress from being restored again on next startup.

## Save Compatibility Notes
- `sanitizeCloudSavePayload()` now accepts and preserves `wipeId`.
- Old cloud saves without `wipeId` are still accepted and sanitized safely.
- They are not rejected at the transport layer.
- They are simply recognized as pre-wipe progression and reset by `normalizeHeroState()`.
- Legacy rage/skill save fields continue to be tolerated.

## Files Updated
- `src/game/constants.ts`
- `src/game/types.ts`
- `src/game/createInitialHero.ts`
- `src/game/save/saveSystem.ts`
- `src/game/save/cloudSaveSanitizer.ts`
- `src/app/AppShell.tsx`
- `src/game/save/cloudSaveSanitizer.test.ts`
- `src/game/formulas/formulas.test.ts`

## Tests Added Or Updated
- new hero includes current `GAME_WIPE_ID`
- old local hero without `wipeId` resets to fresh level 1 progression
- old cloud hero without `wipeId` resets safely
- outdated `wipeId` resets safely
- current `wipeId` preserves gameplay progress
- identity fields survive the gameplay reset path
- inventory / equipment / known recipes / quests are reset after wipe
- cloud save sanitizer preserves `wipeId`

## Validation Results
- `npm run validate:data`: PASS with existing warning-only audit output
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm run test`: PASS
- `npm run build`: PASS with existing Vite chunk-size warning
- `npm run balance:audit`: PASS

## Manual Testing Steps
1. Start the app with no local save and confirm the created hero is level 1 with the starting loadout.
2. Inject or load a local save without `wipeId` and confirm startup resets the hero to fresh progression.
3. Refresh the app and confirm the reset local hero now persists normally.
4. Load a cloud save without `wipeId` and confirm:
   - hero resets to level 1
   - selected location returns to the first location
   - a subsequent reload does not restore the old cloud progression
5. Load a cloud/local save with current `wipeId` and confirm progression is preserved.
6. Confirm Telegram/account identity still resolves correctly after wipe.
