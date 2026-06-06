# CRAFTING_REDESIGN_PHASE_2B_RECIPE_ECONOMY_REPORT

## Files changed

- `src/data/equipmentCatalog.ts`
- `scripts/validateData.mjs`
- `src/data/equipmentCatalog.test.ts`

## Number of live recipes inspected

- Live runtime recipes inspected: `99`
- Source of truth used: `src/data/equipmentCatalog.ts`
- Re-export path preserved: `src/data/recipes.ts`

## Slot and level-step coverage

Live runtime crafting continues to cover all `9` supported slots:

- `weapon`
- `shield`
- `head`
- `chest`
- `hands`
- `legs`
- `feet`
- `ring`
- `amulet`

All `11` intended equipment progression steps remain covered:

- `1`
- `3`
- `6`
- `9`
- `12`
- `15`
- `18`
- `21`
- `24`
- `27`
- `30`

## Recipe material structure before and after

### Before

The live runtime ladder used a very generic material selection rule:

- 2-material recipes in most cases
- materials chosen broadly by old numeric `tier`
- little slot identity beyond rough metal versus leather versus fabric preference
- no clear base/tier/faction/catalyst/boss structure
- gold scaling followed a simple `8 + tier * 6` curve

This made the recipe economy easy to maintain, but too vague for the Phase 2A material model.

### After

The live runtime ladder now uses explicit slot recipe profiles:

- per-slot material sets for each of the `11` level steps
- per-slot gold costs for each step
- clearer separation between:
  - base materials
  - tier/progression materials
  - faction materials
  - catalysts
  - boss materials
- stronger slot identity:
  - weapons lean on metal plus aggressive/thematic materials
  - shields lean on fortress and defensive materials
  - chest pieces use the highest raw-material load
  - smaller armor slots use lighter base costs
  - rings and amulets rely more on faction, catalyst, and capstone materials

## How live recipes now use material categories

### Base materials

Still anchor the early and midgame recipe economy:

- `MAT_001 Torn Cloth`
- `MAT_002 Cracked Leather`
- `MAT_003 Bent Iron Scrap`

These remain common in early levels and continue to appear later as raw-input costs, but no longer carry high-tier recipes by themselves.

### Tier materials

Live recipes now use progression metals and ore as the main craft-gating spine:

- `MAT_007 Iron Rivets`
- `MAT_008 Chain Links`
- `MAT_013 Tempered Iron Bar`
- `MAT_016 Legion Steel Plate`
- `MAT_019 Crimson Ore`

These are now much more clearly tied to mid and late progression steps.

### Faction materials

Thematic materials now appear consistently by level band and slot role:

- `MAT_004 Wolf Fang`
- `MAT_005 Raider Emblem`
- `MAT_006 Blackfang Pelt`
- `MAT_009 Guard Insignia`
- `MAT_010 Ash Resin`
- `MAT_012 Mercenary Mark`
- `MAT_015 Raven Feather`
- `MAT_018 Arena Medal`

### Catalysts

Catalysts are now introduced deliberately instead of being absent from the live runtime path:

- `MAT_011 Blood Ash`
- `MAT_023 Rage-Etched Shard`
- `MAT_024 Staggered Bone Plate`

They appear first in the level `12-15` range for more special recipes, then more often from `18+`, especially for jewelry, shields, and capstone crafts.

### Boss materials

Boss materials are reserved for special late-step recipes instead of being spread everywhere:

- `MAT_014 Executioner's Hook`
- `MAT_017 Ash Sigil Fragment`
- `MAT_020 Vaelor Ash Core`

Boss material usage is intentionally concentrated in later, more identity-driven recipes.

## Any recipes intentionally left using legacy materials

None.

Legacy compatibility remains intact through the Phase 1 compatibility layer, but the live runtime recipe ladder intentionally does not use:

- `MAT_021 Fine Leather Thread`
- `MAT_022 Polished Weapon Grip`

This keeps saves compatible without keeping legacy materials in the active progression economy.

## Validation updates added

`scripts/validateData.mjs` now validates the live runtime recipe economy through `LIVE_RECIPE_SLOT_PROFILES`:

- every live slot profile has valid slot coverage
- every live slot profile covers all `11` crafting steps
- every live recipe material exists
- every live recipe material has taxonomy coverage
- every live recipe gold cost is valid
- low-level live recipes do not require boss or catalyst materials too early
- higher-progress live recipes do not collapse into base-only costs
- late-step recipes can be warned if they are missing stronger progression material types

This keeps the validator aware of the real runtime recipe source instead of only the generated JSON recipe families.

## Warnings that remain

Phase 2B left pre-existing warning-only issues intact where they are outside the runtime recipe economy scope:

- `REC_030` still uses a suspicious `100` recipe drop chance
- the placeholder separator row still exists in `minorArmorRecipeDrops.json`
- several `spawnPools` entries still refer to human-readable enemies without direct definitions
- generated Blackfang Alpha entries still lack direct reachable spawnPool mapping
- some generated JSON recipe families still appear unused by recipe-drop datasets
- two items still appear unused by loot, recipes, or notable loot references

The new live runtime recipe ladder itself validates cleanly.

## Validation command results

- `npm run validate:data`: passed with warnings
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed
