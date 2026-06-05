# P2B Deep Data Validation Expansion Report

## Validation coverage added

- Expanded `scripts/validateData.mjs` from a small generated-core audit into a broader cross-dataset validator with separate hard errors and warnings.
- Added boss validation for:
  - boss ids and names
  - boss numeric combat stats
  - location boss/key-enemy references
  - boss loot and boss loot material/item references
- Added recipe-drop family validation for:
  - base recipe drops
  - ring recipe drops
  - shield recipe drops
  - amulet recipe drops
  - minor armor recipe drops
- Added split equipment catalog validation for:
  - weapons
  - armors
  - shields
  - rings
  - amulets
  - minor armor slot catalogs
- Added loot and resolved-item validation for:
  - unique loot entries
  - location notable loot entries
  - crafting outputs
  - merged item resolution paths across generated/static support catalogs
- Added material validation for:
  - unique ids
  - names
  - rarity
  - tags
  - level ranges
  - recipe material references
- Added data quality warnings for suspicious but non-fatal cases.

## Datasets now checked

- `src/data/generated/locations.json`
- `src/data/generated/enemies.json`
- `src/data/generated/items.json`
- `src/data/generated/materials.json`
- `src/data/generated/recipes.json`
- `src/data/generated/recipeDrops.json`
- `src/data/generated/bosses.json`
- `src/data/generated/lootTables.json`
- `src/data/generated/spawnPools.json`
- `src/data/generated/ringRecipes.json`
- `src/data/generated/shieldRecipes.json`
- `src/data/generated/amuletRecipes.json`
- `src/data/generated/minorArmorRecipes.json`
- `src/data/generated/ringRecipeDrops.json`
- `src/data/generated/shieldRecipeDrops.json`
- `src/data/generated/amuletRecipeDrops.json`
- `src/data/generated/minorArmorRecipeDrops.json`
- `src/data/generated/weapons.json`
- `src/data/generated/armors.json`
- `src/data/generated/shields.json`
- `src/data/generated/rings.json`
- `src/data/generated/amulets.json`
- `src/data/generated/minorArmor.json`
- `src/data/shieldLoot.ts`
- `src/data/ringLoot.ts`
- `src/data/amuletLoot.ts`
- `src/data/minorArmorLoot.ts`
- runtime merged item resolution through `src/data/items.ts`

## Hard errors found and fixed

- Fixed invalid negative boss `damageMax` values in `src/data/generated/bosses.json`.
- Corrected stale boss unique loot references in `src/data/generated/bosses.json`.
- Fixed malformed material `levelRange` max values in `src/data/generated/materials.json`.
- Corrected stale recipe-drop source location name `Blackfang Gate` to `Iron Bastion Approach`.
- Fixed a truncated notable loot entry in `src/data/generated/lootTables.json` (`T...` to `Three Ash Sigils`).
- Added missing support item definitions referenced by loot data in `src/data/generated/items.json`:
  - `Fang Charm`
  - `Blood Raider Chestguard`
  - `Iron Tyrant Seal`
  - `Blackfang Vest`
  - `Iron Vanguard Plate`
  - `Ashbound Vest`
  - `Torn Road Vest`
  - `Gate Warden Cuirass`
  - `Watchtower Helm`
- Expanded `src/data/items.ts` so runtime item resolution now includes generated support catalogs for:
  - shields
  - rings
  - amulets
  - minor armor

## Data references corrected

- Boss loot references were aligned to existing/support item definitions.
- Support recipe-drop location references were aligned to the real repository location naming.
- Missing loot/notable item references were backed by new generated item definitions instead of removing content.

## Warnings that remain

- `REC_030` still uses an intentionally suspicious `100` recipe-drop chance.
- `minorArmorRecipeDrops.json` still contains a placeholder separator row; the validator now ignores it and reports it as a warning.
- Several `spawnPools` enemy names have no direct enemy definition and appear to be higher-level/source names rather than concrete entries.
- Several generated `Blackfang Alpha` enemy rows still have no reachable spawn-pool mapping.
- Two newly defined support items are currently unused by loot/recipe/notable-loot references:
  - `blackfang_vest`
  - `iron_vanguard_plate`
- A set of starter/progression recipes remain unused by recipe-drop datasets, which is warned instead of failed.

## Validation command results

- `npm run validate:data`: passed with warnings
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed (`8` files, `104` tests)
- `npm run build`: passed
