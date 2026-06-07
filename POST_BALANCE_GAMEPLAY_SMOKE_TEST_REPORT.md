# Post-Balance Gameplay Smoke Test Report

Date: 2026-06-07

## Scope

This report compiles the latest five gameplay/balance audit outputs into one post-balance smoke summary:

1. `ENEMY_BALANCE_AUDIT_REPORT.md`
2. `ENEMY_BALANCE_TUNING_PASS_REPORT.md`
3. `QUEST_UI_AND_ACTIVE_QUEST_CLEANUP_AFTER_CRAFTING_REWORK_REPORT.md`
4. `CRAFTING_QUEST_RECIPE_PROGRESSION_REWORK_NO_BOSSES_REPORT.md`
5. `CRAFTING_POST_PHASE_5_MATERIAL_DISTRIBUTION_AND_QUANTITY_AUDIT_REPORT.md`

No new gameplay code changes were made for this consolidation pass.

## Audit Areas

### 1. Enemy Progression Audit

Status: `WARNING`

Exact files inspected:

- `ENEMY_BALANCE_AUDIT_REPORT.md`
- `scripts/combatBalanceAudit.mjs`
- `src/data/generated/enemies.json`
- `src/data/generated/locations.json`
- `src/data/generated/spawnPools.json`
- `src/game/formulas/enemyScaling.ts`

Confirmed working flows:

- Full location-by-location simulation exists for `LOC_001` through `LOC_014`.
- Mode A (no between-fight regen) was used as the primary balance benchmark.
- Enemy/location scaling inputs are wired through generated enemy, location, and spawn-pool data.

Bugs or risks found:

- `LOC_001` remains above the target average kills-per-run window (`8.35`) and is explicitly marked as a skip area rather than fully normalized.
- This is not presented as a hard gameplay break, but it does leave early-game pacing looser than the stated target band.

Recommended next fixes:

- `P2`: Revisit `LOC_001` onboarding pacing if the team wants the starting zone to conform to the same kill-per-run target used elsewhere.

### 2. Enemy Tuning Compliance Pass

Status: `PASS`

Exact files inspected:

- `ENEMY_BALANCE_TUNING_PASS_REPORT.md`
- `scripts/tuneEnemies.mjs`
- `scripts/combatBalanceAudit.mjs`
- `src/data/generated/enemies.json`
- `src/game/formulas/enemyScaling.ts`

Confirmed working flows:

- All targeted progression locations are reported within the owner target of `2.5 - 4.5` average kills per run in Mode A.
- Late-game scaling pressure was reduced by moving the tuning logic away from runaway scaling behavior.
- The balance simulator uses seeded randomness for before/after comparisons, which makes results reproducible.

Bugs or risks found:

- No new P0/P1 issue was confirmed in this area.
- Balance safety here still depends on the generated enemy dataset staying aligned with the tuning assumptions.

Recommended next fixes:

- `P2`: Add a lightweight regression check that fails if future enemy-data edits push any post-`LOC_001` progression zone outside the `2.5 - 4.5` Mode A target.

### 3. Quest UI and Active Quest Cleanup

Status: `PASS`

Exact files inspected:

- `QUEST_UI_AND_ACTIVE_QUEST_CLEANUP_AFTER_CRAFTING_REWORK_REPORT.md`
- `src/data/quests.ts`
- `src/game/save/saveSystem.ts`
- `src/app/AppShell.tsx`
- `src/features/quests/questDisplayHelpers.ts`
- `src/features/quests/QuestsScreen.tsx`
- `src/game/formulas/formulas.test.ts`

Confirmed working flows:

- Active quest log is reduced to the curated crafting chain instead of mixing in the large generated quest set.
- Existing saves are normalized through `normalizeHeroState` without wiping curated progress.
- Cloud-loaded heroes are normalized before app state is committed.
- Reward display formatting now covers gold, XP, recipes, and material quantities.
- Reported verification suite passed: `typecheck`, `lint`, `test`, `validate:data`, and `build`.

Bugs or risks found:

- No new P0/P1 issue was confirmed in this area.
- The report text shows mojibake in some Ukrainian examples, but that is a report-encoding artifact, not enough evidence by itself to call the runtime UI broken.

Recommended next fixes:

- `P2`: Do a quick in-app visual pass on quest reward text rendering to confirm production UI encoding matches the intended localized strings.

### 4. Crafting Quest and Recipe Progression Rework

Status: `PASS`

Exact files inspected:

- `CRAFTING_QUEST_RECIPE_PROGRESSION_REWORK_NO_BOSSES_REPORT.md`
- `src/data/recipeDropSources.ts`
- `src/features/combat/services/combatRewards.ts`
- `src/game/formulas/loot.ts`
- `src/data/recipeDropSources.test.ts`
- `scripts/validateData.mjs`

Confirmed working flows:

- Live recipe progression no longer depends on `unlockType: "boss"`.
- Quest rewards now cover the curated guaranteed progression chain across all core equipment slots.
- Non-quest recipe drops still use pity logic with capped catch-up odds.
- Combat reward flow passes `currentLocation` into loot drop resolution so location-aware material filtering can run.
- Reported verification suite passed: `typecheck`, `lint`, `test`, `validate:data`, and `build`.

Bugs or risks found:

- No new P0/P1 issue was confirmed in this area.
- Recipe progression safety now depends on keeping quest-only, starter, drop, and elite unlock rules consistent as future recipes are added.

Recommended next fixes:

- `P2`: Add a focused regression test for each slot’s final progression path so future data edits cannot silently reintroduce boss-gated or unreachable recipes.

### 5. Crafting Material Distribution and Quantity Audit

Status: `WARNING`

Exact files inspected:

- `CRAFTING_POST_PHASE_5_MATERIAL_DISTRIBUTION_AND_QUANTITY_AUDIT_REPORT.md`
- `scripts/lib/craftingMaterialAudit.mjs`
- `scripts/materialAuditMatrix.mjs`
- `scripts/validateData.mjs`
- `src/data/craftingMaterialAudit.test.js`
- `src/data/equipmentCatalog.ts`
- `src/data/generated/materials.json`
- `src/data/generated/materialSources.json`
- `src/features/combat/services/combatRewards.ts`
- `src/game/formulas/loot.ts`

Confirmed working flows:

- All `99` live equipment recipes were audited against material progression and source availability.
- Hard progression errors were reduced to `0`.
- `MAT_007` progression access was corrected for level 6 recipes.
- `MAT_006` usage was broadened conservatively without reopening invalid progression.
- Validation and test hooks exist for material/source alignment.
- Reported verification suite passed: `validate:data`, `typecheck`, `lint`, `test`, and `build`.

Bugs or risks found:

- `40` heuristic warnings remain after fixes; these are flagged as non-blocking balance concentrations rather than progression failures.
- The report explicitly calls out an out-of-scope runtime issue: `rollLootDrop()` still does not fully respect design-intended material-to-enemy associations and still selects materials broadly by tier/target level.

Recommended next fixes:

- `P2`: Implement `CRAFTING_RUNTIME_MATERIAL_DROP_SOURCE_ALIGNMENT` so runtime material drops follow the same source logic the audit expects.
- `P2`: Review the remaining heuristic warnings for over-concentrated signature materials and high-tier quantity pressure.

## Ranked Next Fixes

- `P0`: None confirmed from the five audited areas.
- `P1`: None confirmed from the five audited areas.
- `P2`: Align runtime material drops with design-intended material-to-enemy/source associations in `src/game/formulas/loot.ts`.
- `P2`: Add automated balance guardrails for kills-per-run target drift outside `LOC_001`.
- `P2`: Add progression regression tests that protect slot coverage, quest guarantees, and non-boss unlock integrity.
- `P2`: Run a quick visual quest UI localization pass to confirm reward text renders correctly in-app.

## Final Verdict

`SAFE TO CONTINUE`

Reason:

- No new P0 or P1 gameplay blocker was confirmed in the five compiled audit areas.
- The remaining issues are warning-level balance follow-ups and one known runtime/design-alignment gap in material drops, currently best ranked as `P2`.
