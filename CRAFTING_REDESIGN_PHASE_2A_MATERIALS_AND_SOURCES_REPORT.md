# CRAFTING_REDESIGN_PHASE_2A_MATERIALS_AND_SOURCES_REPORT

## Files changed

- `src/data/generated/materials.json`
- `src/data/generated/locations.json`
- `src/data/generated/lootTables.json`
- `src/data/materialTaxonomy.ts`
- `scripts/validateData.mjs`

## New and updated material categories

Phase 2A kept the existing 24 material IDs and reorganized them into the planned material model without deleting legacy content:

- `base`: shared early crafting inputs from common enemies and basic loot
- `tier`: progression-gating metal or ore materials that support equipment step progression
- `faction`: region or family-themed materials tied to Blackfang, raider, legion, mercenary, ash, raven, and arena paths
- `catalyst`: rarer upgrade materials reserved for stronger enemies, elites, and future higher-rarity crafting
- `boss`: elite or key progression materials linked to execution, sanctuary, and final-arc boss themes
- `legacy`: preserved old refined materials kept valid for saves and existing recipe references

## New and updated material list

Each material now has clearer `taxonomyCategory`, `tierStep`, `source`, `primaryUsage`, and stronger tags in `src/data/generated/materials.json`.

- `MAT_001 Torn Cloth`: base, step 1
- `MAT_002 Cracked Leather`: base, step 1
- `MAT_003 Bent Iron Scrap`: base, step 1
- `MAT_004 Wolf Fang`: faction, step 3
- `MAT_005 Raider Emblem`: faction, step 6
- `MAT_006 Blackfang Pelt`: faction, step 6
- `MAT_007 Iron Rivets`: tier, step 6
- `MAT_008 Chain Links`: tier, step 9
- `MAT_009 Guard Insignia`: faction, step 9
- `MAT_010 Ash Resin`: faction, step 12
- `MAT_011 Blood Ash`: catalyst, step 12
- `MAT_012 Mercenary Mark`: faction, step 15
- `MAT_013 Tempered Iron Bar`: tier, step 15
- `MAT_014 Executioner's Hook`: boss, step 18
- `MAT_015 Raven Feather`: faction, step 18
- `MAT_016 Legion Steel Plate`: tier, step 21
- `MAT_017 Ash Sigil Fragment`: boss, step 24
- `MAT_018 Arena Medal`: faction, step 24
- `MAT_019 Crimson Ore`: tier, step 27
- `MAT_020 Vaelor Ash Core`: boss, step 30
- `MAT_021 Fine Leather Thread`: legacy, step 9
- `MAT_022 Polished Weapon Grip`: legacy, step 15
- `MAT_023 Rage-Etched Shard`: catalyst, step 18
- `MAT_024 Staggered Bone Plate`: catalyst, step 21

## Material source plan by enemy, location, and boss type

- Common enemies remain the main source of base materials: cloth, leather, and scrap.
- Early faction enemies now more clearly point toward `Wolf Fang`, `Raider Emblem`, and `Blackfang Pelt`.
- Fortress defenders and watchtower enemies now more clearly support the `Iron Rivets`, `Chain Links`, and `Guard Insignia` lane.
- Midgame ash and mercenary zones now point more clearly toward `Ash Resin`, `Blood Ash`, `Mercenary Mark`, and `Tempered Iron Bar`.
- Execution, raven, bastion, sanctuary, arena, quarry, and threshold zones now expose the later boss and catalyst materials through location material lists instead of only scattered loot text.
- Boss and elite identities were kept distinct:
  - execution-themed elites feed `Executioner's Hook`
  - ash ritual enemies feed `Ash Sigil Fragment` and `Blood Ash`
  - high-risk elites feed `Rage-Etched Shard`
  - heavy brute and defender paths feed `Staggered Bone Plate`
  - end-arc content feeds `Vaelor Ash Core`

## Loot and source changes made

- Added clearer `taxonomyCategory` and `tierStep` metadata directly to every material record.
- Expanded location material lists so mid and late locations expose the materials their loot themes already imply.
- Removed a few misleading early source hints from loot tables:
  - `Blood Raider` no longer implies `Executioner's Hook` too early.
  - `Legion Protector` and `Gate Hammerman` no longer imply late heavy materials too early.
  - `Ash Fang Zealot` now points toward a more believable late-ash material mix.
- Updated `materialLoot` source descriptions for `Guard Insignia`, `Blood Ash`, `Tempered Iron Bar`, `Rage-Etched Shard`, and `Staggered Bone Plate` so the human-readable source plan better matches the progression model.

## How legacy materials remain compatible

- `MAT_021 Fine Leather Thread` and `MAT_022 Polished Weapon Grip` were preserved.
- No save conversion was performed.
- No material IDs were deleted or renamed.
- Existing legacy compatibility remains active through the Phase 1 compatibility layer.

## Recipe compatibility preserved

- No recipe IDs were removed.
- No `knownRecipeIds` behavior was touched.
- Existing recipe material references still resolve to valid material IDs.
- Crafting outputs and resolved item paths were left intact.
- This phase intentionally did not rewrite the broader recipe economy or slot-by-slot crafting costs.

## Validation updates added

`scripts/validateData.mjs` now additionally checks:

- JSON-side material `taxonomyCategory` values
- JSON-side material `tierStep` values
- alignment between `materials.json` and `materialTaxonomy.ts`
- required material `primaryUsage` and non-legacy source hints
- `enemyLoot.primary_materials` references
- `locationLoot.primary_materials` references
- `materialLoot.material_name`, source locations, source enemies, and drop chances

## Validation warnings that remain

Warnings were preserved where they represent existing soft-quality issues rather than Phase 2A breakage:

- `REC_030` still uses a suspicious `100` recipe drop chance and is treated as a warning
- the placeholder separator row remains in `minorArmorRecipeDrops.json`
- several `spawnPools` entries still reference human-readable enemies without direct enemy definitions
- several generated Blackfang Alpha enemy rows still have no reachable spawnPool entry
- two items remain unused by loot and recipe references
- several starter or baseline recipes remain unused by recipe-drop datasets

## Validation command results

- `npm run validate:data`: passed with warnings
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed
