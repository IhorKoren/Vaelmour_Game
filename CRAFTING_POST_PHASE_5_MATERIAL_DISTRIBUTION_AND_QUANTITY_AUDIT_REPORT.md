# Crafting Post Phase 5 Material Distribution and Quantity Audit Report

## Scope

This audit focused only on live crafting material progression, recipe requirements, source data, taxonomy-backed validation, and recipe quantity sanity for the 99 active equipment recipes generated from `LIVE_RECIPE_SLOT_PROFILES`.

Combat formulas, Combat Phase 4, runtime crafting transaction flow, and runtime `rollLootDrop()` behavior were not changed.

## Matrix Summary

- Live recipes audited: `99`
- Recipe-material rows audited: `338`
- Hard progression errors after fixes: `0`
- Audit heuristic warnings after fixes: `40`
- Legacy materials found in live recipes: `0`
- Accepted explicit exceptions preserved:
  - `recipe_ring_band_lvl_01 | MAT_004`
  - `recipe_amulet_charm_lvl_01 | MAT_004`

The full matrix is produced by:

```powershell
node scripts/materialAuditMatrix.mjs
```

The matrix includes:

- recipe id
- result item id
- slot
- required level
- material id and quantity
- taxonomy category
- taxonomy tier step / level range
- earliest source
- earliest source location id
- earliest source min level
- source type
- alignment status

## Mismatches Found

### Fixed

- `MAT_007 / Iron Rivets` was required by all level 6 live recipes but previously had its earliest explicit source at `LOC_004 / Old Watchtower` with minimum level `7`.
- This created an invalid progression gap for level 6 recipes.

### Accepted by design

- `MAT_004 / Wolf Fang` remains in `ring` level 1 and `amulet` level 1 live recipes.
- This remains allowed because those two level 1 accessory recipes are early drop-unlocks, not starter grants.

## Exact Fixes Made

### Material source alignment

- Added `MAT_007` as a secondary real source to `LOC_003 / Raider Camp`.
- Added a matching `materialSources.json` entry for raider-salvaged rivets.
- Updated `MAT_007` metadata in `materials.json` from level band `7-12` to `5-12`.
- Updated `MAT_007` source text/notes so the metadata matches the new earlier source.

### Small recipe adjustments

- Expanded `MAT_006 / Blackfang Pelt` usage from `1` live recipe to `3` live recipes.
- Replaced the level 6 `hands` faction requirement from `MAT_005` to `MAT_006`.
- Expanded the level 6 `ring` recipe to use both `MAT_005` and `MAT_006`, while keeping total cost conservative.

### Validator and audit tooling

- Added `scripts/lib/craftingMaterialAudit.mjs` as a shared audit utility for live crafting materials.
- Added `scripts/materialAuditMatrix.mjs` to print the live recipe/material/source matrix.
- Extended `scripts/validateData.mjs` to include hard progression validation and warning-level audit heuristics from the shared audit.
- Added `src/data/craftingMaterialAudit.test.js` to cover the new audit behavior.

## MAT_007 Status

`MAT_007` was fixed by adding an earlier level 5 source at `LOC_003 / Raider Camp`. Level 6 live recipes now align with same-or-earlier progression access.

## MAT_006 Status

`MAT_006` was underused before this audit. It was expanded cautiously to a few thematic level 6 recipes and now appears in `3` live recipes instead of `1`. It was not spread broadly across all level 6-9 recipes.

## Base and Legacy Material Confirmation

- `MAT_001 / MAT_002 / MAT_003` base material scaling is intentional and was not treated as an overuse error.
- `MAT_021` and `MAT_022` were kept for compatibility and were not removed.
- `MAT_021` and `MAT_022` do not appear in active live recipes after audit.

## Live Recipe Progression Confirmation

- Ring level 1 remained active.
- Amulet level 1 remained active.
- Hidden starter recipes for weapon, shield, head, chest, hands, legs, and feet level 1 were not reintroduced into active compatible progression.

## Remaining Warnings

Remaining warnings are heuristic balance flags, not progression blockers. The main warning groups are:

- non-base material concentration within a single tier, especially tier signature materials such as `MAT_007`, `MAT_008`, `MAT_009`, `MAT_013`, `MAT_016`, `MAT_019`, `MAT_023`, and `MAT_024`
- a few catalyst/boss quantity flags at higher tiers
- one early total-quantity flag on `recipe_chest_armor_lvl_03`
- a few "used below tier step" flags where source access is still valid but the taxonomy tier step is stricter than the recipe timing

These warnings were intentionally left as warnings because they indicate balance concentration or tuning pressure, not invalid progression.

## Runtime Drop Logic Note

Known out-of-scope issue:

`rollLootDrop()` still does not fully respect design-intended material-to-enemy associations and continues to select materials broadly by tier/target level.

This was not changed in this task.

Recommended future task:

`CRAFTING_RUNTIME_MATERIAL_DROP_SOURCE_ALIGNMENT`

## Validation Results

Executed successfully:

- `npm run validate:data`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Notes:

- `validate:data` passes with existing project warnings plus the new audit warnings.
- The production build still shows the pre-existing Vite chunk-size warning for a large bundle, but the build succeeds.
