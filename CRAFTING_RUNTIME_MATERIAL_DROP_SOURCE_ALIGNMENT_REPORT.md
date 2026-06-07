# Crafting Runtime Material Drop Source Alignment Report

Date: 2026-06-07

## Summary

This task aligned runtime crafting material drops with the same source logic already used by the crafting progression redesign and material audit passes.

The main issue before this fix was that `rollLootDrop()` selected materials from a broad `tier <= targetLevel` pool and only narrowed it with `location.materials` when a location was provided. It did not use:

- `materialSources.json`
- enemy name, family, or archetype
- source type distinctions such as `Enemy Drop`, `Rare Enemy Drop`, `Elite Drop`, or `Boss/Elite Drop`
- runtime reachability checks for live recipe materials

That made the game progression-safe on paper, but the live combat drop experience still felt too generic.

## Files Inspected

- `src/game/formulas/loot.ts`
- `src/features/combat/services/combatRewards.ts`
- `src/data/generated/materials.json`
- `src/data/generated/materialSources.json`
- `src/data/generated/locations.json`
- `src/data/generated/spawnPools.json`
- `src/data/materialTaxonomy.ts`
- `src/data/equipmentCatalog.ts`
- `src/data/quests.ts`
- `scripts/lib/craftingMaterialAudit.mjs`
- `scripts/materialAuditMatrix.mjs`
- `scripts/validateData.mjs`
- `src/data/craftingMaterialAudit.test.js`
- `src/game/formulas/formulas.test.ts`

## What Changed

### Previous runtime behavior

Before this fix, runtime material drops were resolved like this:

1. Build a pool of all `material` items with `tier <= targetLevel`.
2. If `location.materials` existed, filter to those IDs.
3. Choose uniformly from the remaining pool.

This meant runtime selection ignored explicit source associations such as:

- wolves and hunters for beast/leather materials
- raiders and humanoids for scrap, rivets, and faction tokens
- cult enemies for ash/alchemy materials
- brutes and quarry enemies for ore, hooks, and heavy components

### New runtime resolution order

Added `src/game/formulas/materialDropResolver.ts` and moved runtime pool selection to this order:

1. Explicit source matches from `materialSources.json` for the current location and current enemy/source context.
2. Location material pool from `locations.json`, but still filtered for runtime-appropriate source eligibility.
3. Taxonomy-compatible progression pool for the current band.
4. Safe fallback only if all three earlier stages are empty.

The fallback path remains intentionally broad, but it is now the last resort instead of the normal behavior.

## Source Alignment Examples

- `LOC_002 / Blackfang Forest` hunter-beast fights now bias toward `MAT_002` and `MAT_004` instead of a generic early-tier mix.
- `LOC_003 / Raider Camp` raider fights now prefer explicit raider-linked sources such as `MAT_005` and `MAT_007`.
- `LOC_007 / Mercenary Crossroads` fighter/mercenary fights now resolve from mercenary-aligned materials such as `MAT_012` and `MAT_013`.
- `LOC_013 / Crimson Quarry` brute-heavy fights now keep quarry/heavy materials like `MAT_019` in the runtime pool instead of treating the zone as just another late-tier bucket.

## Fallback Rules

Fallback now happens only when:

- no explicit material source matches the current location/enemy context,
- no valid `location.materials` candidate remains for the current runtime context,
- and no taxonomy-compatible progression pool remains.

The fallback still returns a material rather than failing the drop outright, but it is clearly isolated as the last stage in the resolver.

## Recipe Reachability Verification

Extended the crafting audit so each live recipe material row now tracks:

- whether a design source exists,
- whether a runtime drop source exists,
- whether a non-boss runtime source exists,
- whether a quest reward source exists,
- and whether boss-only source data exists.

Verification outcome:

- all live recipe materials still have a reachable path,
- no active live recipe progression depends on a boss-only material source with no alternative,
- quest reward sources continue to cover materials such as `MAT_020` where progression intentionally relies on curated reward support.

## Tests Added or Updated

Updated `src/game/formulas/formulas.test.ts` to prove:

- runtime drops still honor explicit location filtering,
- explicit source matches are preferred over generic location pools,
- safe fallback is used only when the source, location, and taxonomy pools are all empty,
- representative beast, mercenary, and quarry locations return thematic material IDs.

Updated `src/data/craftingMaterialAudit.test.js` to prove:

- all live recipe materials have either a non-boss runtime source or a quest reward source,
- quest-supported late materials such as `MAT_020` remain progression-safe.

## Validation Results

Executed successfully:

- `npm run validate:data`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run balance:audit`

Notes:

- `validate:data` still reports the existing warning set from the crafting audit and broader data validation pass; no new hard errors were introduced.
- `build` still reports the pre-existing Vite chunk-size warning, but the build succeeds.
- `balance:audit` remained unchanged in outcome, confirming enemy balance was not accidentally modified by this task.

## Exact Files Changed

- `src/game/formulas/materialDropResolver.ts`
- `src/game/formulas/loot.ts`
- `src/game/formulas/formulas.test.ts`
- `scripts/lib/craftingMaterialAudit.mjs`
- `scripts/materialAuditMatrix.mjs`
- `src/data/craftingMaterialAudit.test.js`

## Remaining Risks

- Some source datasets still contain abstract spawn names that do not resolve one-to-one to concrete enemy definitions. Validation already reports those as warnings, and the new resolver falls back safely when needed.
- The resolver is intentionally heuristic for theme weighting. It is much more source-aware than before, but future content additions should keep `materialSources.json`, `locations.json`, and spawn naming aligned so the explicit-source stage stays dominant.
