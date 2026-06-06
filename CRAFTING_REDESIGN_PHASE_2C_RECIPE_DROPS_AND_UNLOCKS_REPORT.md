# CRAFTING_REDESIGN_PHASE_2C_RECIPE_DROPS_AND_UNLOCKS_REPORT

## Scope

Phase 2C redesigned the live recipe unlock path so runtime crafting progression now uses an explicit, validated unlock-source layer instead of relying on mixed generated recipe-drop JSON plus `unlockMethod` string heuristics.

This phase did not rebalance material costs or change save format. It focused on recipe unlock clarity, compatibility, and validation coverage.

## What Was Added

### 1. Normalized live recipe unlock layer

Added [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\recipeDropSources.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/recipeDropSources.ts>) with:

- `LIVE_RECIPE_LEVEL_STEPS`
- `LIVE_RECIPE_UNLOCK_SLOTS`
- `STARTER_RECIPE_IDS`
- `LIVE_RECIPE_UNLOCK_TEMPLATES`
- expanded `LIVE_RECIPE_UNLOCK_RULES`
- compatibility helpers for live and legacy generated recipe ids
- source/descriptor helpers for runtime recipe metadata
- live recipe unlock roll logic used by combat rewards

### 2. Clear starter recipe policy

Starter-known recipes are now explicit instead of inferred from free-text unlock labels.

Starter set:

- weapon lvl 1
- shield lvl 1
- head lvl 1
- chest lvl 1
- hands lvl 1
- legs lvl 1
- feet lvl 1

Ring and amulet level 1 recipes are now early unlock drops instead of silent starter grants.

### 3. Runtime unlock integration

Updated runtime systems to use the normalized unlock layer:

- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\game\createInitialHero.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/game/createInitialHero.ts>)
- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\features\combat\services\combatRewards.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/features/combat/services/combatRewards.ts>)
- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\features\crafting\CraftingScreen.tsx](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/features/crafting/CraftingScreen.tsx>)
- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\craftingRecipeMetadata.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/craftingRecipeMetadata.ts>)
- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\equipmentCatalog.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/equipmentCatalog.ts>)

### 4. Save compatibility preservation

Updated [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\game\save\cloudSaveSanitizer.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/game/save/cloudSaveSanitizer.ts>) so `knownRecipeIds` continue to accept:

- live runtime recipe ids
- legacy generated recipe ids from older content

This avoids stripping older learned recipe ids from existing saves.

### 5. Legacy recipe-drop cleanup

Updated [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\recipeDrops.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/recipeDrops.ts>) and [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\generated\minorArmorRecipeDrops.json](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/generated/minorArmorRecipeDrops.json>) to remove placeholder separator rows from the active access layer.

## Validation Coverage Added

Expanded [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\scripts\validateData.mjs](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/scripts/validateData.mjs>) with live unlock checks for:

- every live runtime recipe has an unlock path
- every live slot has unlock coverage for all 11 level steps
- every starter recipe id is a valid live recipe id
- starter recipes are marked as `starter` in unlock templates
- non-starter recipes are not mislabeled as `starter`
- unlock slot ids are valid
- unlock levels match supported crafting step levels
- unlock locations resolve to real locations
- unlock enemy/boss names resolve through enemy, boss, or spawn-source lookups
- unlock `chancePercent` values are bounded and warnings highlight unusual values
- legacy recipe-drop datasets still resolve to real generated recipe ids
- guaranteed legacy drop rows such as `REC_030` remain warning-tracked during migration

## Tests Added

Added [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\recipeDropSources.test.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/recipeDropSources.test.ts>) covering:

- full live recipe unlock coverage
- starter recipe policy
- slot-by-slot level-step coverage
- legacy known-recipe compatibility
- unlock roll behavior

Existing data tests also continue to pass, including:

- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\equipmentCatalog.test.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/equipmentCatalog.test.ts>)
- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\materialTaxonomy.test.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/materialTaxonomy.test.ts>)
- [C:\Users\h1sok\OneDrive\Робочий стіл\Vaelmour\Vaelmour_Game\src\data\craftingRecipeMetadata.test.ts](</C:/Users/h1sok/OneDrive/Робочий стіл/Vaelmour/Vaelmour_Game/src/data/craftingRecipeMetadata.test.ts>)

## Hard Errors Found And Fixed

### 1. Circular import in live recipe unlock path

While testing, `recipeDropSources.ts` imported `recipes.ts`, which re-exported from `equipmentCatalog.ts`, while `equipmentCatalog.ts` already imported unlock descriptors from `recipeDropSources.ts`.

This caused runtime test failures because `recipes` was undefined during module initialization.

Fix:

- removed the `recipes.ts` dependency from `recipeDropSources.ts`
- made the unlock layer own live recipe ids directly from unlock rules
- resolved display names in `combatRewards.ts` from the normal recipe catalog instead

### 2. Stale unlock-type branch

Typecheck failed because `recipeDropSources.ts` still had a leftover `'milestone'` branch even though the current live unlock union only supports:

- `starter`
- `drop`
- `elite`
- `boss`

Fix:

- removed the stale branch

### 3. Placeholder recipe-drop row still present in generated minor armor drop data

Fix:

- removed the placeholder row from generated data
- kept the merged access layer defensive by filtering placeholder-style entries

## Data References Corrected

Corrected or normalized references in this phase:

- explicit starter recipe ownership is now data-driven instead of inferred from text
- live runtime recipe source descriptors now resolve from the new unlock template layer
- `knownRecipeIds` compatibility now preserves both live and legacy generated recipe ids
- minor armor recipe-drop placeholder entry no longer leaks into active merged data

## Warnings Remaining

Warnings remain intentionally non-fatal:

- `recipe_chest_armor_lvl_30` has a high final unlock chance (`18%`) compared with the usual live unlock range
- legacy generated recipe drop `REC_030` still uses a `100` chance and remains migration-documented
- multiple spawn-pool enemy names still lack direct enemy definitions and are treated as soft warnings
- several legacy generated recipes remain unused by current recipe-drop datasets
- a small number of items still appear unused by loot/recipe/notable-loot references

These warnings were preserved because they do not block runtime correctness for Phase 2C.

## Validation Command Results

Commands run:

1. `npm run validate:data`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. `npm run build`

Results:

- `npm run validate:data`: passed with warnings
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed (`12` files, `117` tests)
- `npm run build`: passed

## Outcome

Phase 2C now gives Vaelmour a clear live recipe unlock model with:

- explicit starter recipes
- explicit drop/elites/boss unlock progression
- better save compatibility for old learned recipes
- stronger validation around unlock coverage and source references
- cleaner separation between live runtime unlocks and legacy generated recipe-drop datasets
