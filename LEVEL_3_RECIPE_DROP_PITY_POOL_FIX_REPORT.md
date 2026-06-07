# Level 3 Recipe Drop Pity Pool Fix Report

## Old Behavior
Previously, level 3 recipes were evaluated individually in an ordered sequential loop. Because the liveness check used a shared `randomValue` over the loop, and could learn at most the first matching recipe, other candidates were blocked. Additionally, each recipe tracked its own individual pity (+0.5% per fail, capped at +10%), making individual recipes extremely slow to obtain.

## Why the Old 10% Felt Too Slow
Even with a 10% base chance, because the pity built up separately for each individual blueprint, the player could easily go 20+ runs in `LOC_001` without unlocking more than 1 or 2 blueprints. This made early-game progression too grindy and forced players into `LOC_002` without appropriate gear.

## New Pooled Behavior
All active level 3 equipment recipes in `LOC_001` now use a pooled roll mechanism:
1. If there are eligible unknown level 3 recipes for the defeated enemy in `LOC_001`, a single roll is performed for the entire pool.
2. If successful, one recipe is selected randomly from the remaining candidates (controlled deterministically via `poolSelectorRandom` in tests and `Math.random()` in production).
3. Pity is tracked globally for the pool using the key `LOC_001_LEVEL_3_RECIPE_POOL`.
4. If a pooled roll is active, the legacy fallback loop is skipped for that victory to enforce a maximum of 1 learned recipe per combat.

## New Base Chance and Pity Values
- **Base Chance**: `25.0%`
- **Pity Increment**: `+5.0%` per failed victory
- **Hard Guarantee**: After `5` failed attempts, the 6th roll is guaranteed to drop a blueprint (`100%`).
- **Reset**: Pity resets to `0` upon learning a recipe.

## Expected Fights to Receive Recipes
- **1st Recipe**: ~3.2 fights (max 6)
- **2nd Recipe**: ~6.4 fights (max 12)
- **3rd Recipe**: ~9.6 fights (max 18)
On average, 10–20 victories in `LOC_001` will comfortably award the player most of the level 3 set, allowing them to fully gear up before entering the forest.

## Tests Added
The following tests were added to [recipeDropSources.test.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/data/recipeDropSources.test.ts):
1. `proves LOC_001 level 3 pool selects a different recipe when poolSelectorRandom varies`
2. `guarantees LOC_001 level 3 pool unlock on the 6th attempt (after 5 failures)`
3. `excludes known recipes from the LOC_001 level 3 pool`
4. `proves level 6+ recipes are not affected by LOC_001 level 3 pool pity key`

## Validation Results
- **Vitest Unit Tests**: All 190 tests passed successfully.
- **Data Schema Validation (`npm run validate:data`)**: Passed with 0 errors.
- **TypeScript Type Check (`npm run typecheck`)**: Passed with 0 errors.
- **Linter (`npm run lint`)**: Passed with 0 errors.
- **Production Build (`npm run build`)**: Compiled successfully.
- **Balance Audit (`npm run balance:audit`)**: Succeeded.
