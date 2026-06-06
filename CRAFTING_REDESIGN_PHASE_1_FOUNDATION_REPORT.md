# CRAFTING_REDESIGN_PHASE_1_FOUNDATION_REPORT

## Files changed

- `src/data/materialTaxonomy.ts`
- `src/data/legacyMaterialMap.ts`
- `src/data/craftingRecipeMetadata.ts`
- `src/data/materialTaxonomy.test.ts`
- `src/data/craftingRecipeMetadata.test.ts`
- `src/data/items.ts`
- `src/data/resolvedItems.ts`
- `src/features/crafting/CraftingScreen.tsx`
- `src/features/inventory/InventoryScreen.tsx`
- `src/game/save/cloudSaveSanitizer.ts`
- `scripts/validateData.mjs`

## What material taxonomy was added

Added a new taxonomy foundation in `src/data/materialTaxonomy.ts` with explicit support for:

- `base`
- `tier`
- `faction`
- `catalyst`
- `boss`
- `legacy`

Each taxonomy entry now includes:

- material id
- category
- tier step
- level range
- player-facing category label
- primary use
- source hint
- legacy flag

This layer does not delete or rename existing materials. It classifies the current material roster so later rebalancing can build on a stable structure.

## How legacy materials remain compatible

Added `src/data/legacyMaterialMap.ts` as a compatibility layer for legacy material handling.

Current behavior:

- legacy material ids remain valid
- existing material ids are not auto-converted in saves
- `resolvedItems` now normalizes through the legacy compatibility layer before lookup
- `cloudSaveSanitizer` accepts compatible legacy material ids through the same normalization path

This keeps current saves safe while making room for future canonical or replacement mappings.

## What recipe metadata was added

Added `src/data/craftingRecipeMetadata.ts` to derive richer metadata for the live runtime crafting path.

The helper now provides per-live-recipe metadata such as:

- recipe id
- slot
- slot label
- level step
- purpose text
- source hint
- material category summary
- material source hints
- expected affix behavior
- rarity
- crafting tier

This uses `equipmentCatalog.ts` as the live source of truth and shifts recipe presentation toward a data-driven structure without rewriting the whole crafting system.

## What changed in the crafting UI

`src/features/crafting/CraftingScreen.tsx` was updated minimally to consume the new metadata layer.

The crafting screen now shows clearer recipe context, including:

- role or slot label
- recipe purpose text
- source hint for the blueprint
- material category summary
- expected affix behavior
- material source hint list under the materials section

The existing crafting flow, costs, and success behavior were preserved.

## What changed in inventory display

`src/features/inventory/InventoryScreen.tsx` now shows richer material context for material items:

- taxonomy category label
- primary use
- source hint
- legacy compatibility note when relevant

This improves material readability without changing inventory ids or save format.

## What validation checks were added

`scripts/validateData.mjs` now validates the new phase-1 foundation data:

- material taxonomy entries point to real material ids
- taxonomy categories are valid
- taxonomy tier steps match the supported ladder
- taxonomy entries are unique
- legacy material compatibility entries are unique
- legacy compatibility maps point to existing canonical materials
- crafting slot metadata uses valid live crafting slots
- crafting metadata overrides reference valid live runtime recipe ids
- source hints and purpose text produce warnings when too vague or missing

The validator was also updated so it can read TypeScript `as const` arrays directly from the new data files.

## Whether any warnings remain

Yes. `npm run validate:data` passes, but warning-only data issues still remain in the existing content. They are non-blocking for this phase.

Main remaining warning groups:

- existing spawn-pool names that do not map directly to core enemy definitions
- several existing recipe-drop datasets with suspicious or placeholder values
- existing unused item and recipe warnings in older/generated content paths

No new hard data errors were introduced by this phase.

## Validation command results

- `npm run validate:data`: passed with warnings
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed
