# CRAFTING_AND_MATERIALS_REDESIGN_PLAN

## Scope

This is a planning-only document for a future crafting and materials redesign. No gameplay data, save format, JSON content, or code behavior was changed as part of this task.

Inspection commands used during this audit:

- `Get-Content -Raw src/data/generated/materials.json`
- `Get-Content -Raw src/data/generated/recipes.json`
- `Get-Content -Raw src/data/generated/recipeDrops.json`
- `Get-Content -Raw src/data/generated/ringRecipes.json`
- `Get-Content -Raw src/data/generated/shieldRecipes.json`
- `Get-Content -Raw src/data/generated/amuletRecipes.json`
- `Get-Content -Raw src/data/generated/minorArmorRecipes.json`
- `Get-Content -Raw src/data/generated/ringRecipeDrops.json`
- `Get-Content -Raw src/data/generated/shieldRecipeDrops.json`
- `Get-Content -Raw src/data/generated/amuletRecipeDrops.json`
- `Get-Content -Raw src/data/generated/minorArmorRecipeDrops.json`
- `Get-Content -Raw src/data/generated/lootTables.json`
- `Get-Content -Raw src/data/generated/enemies.json`
- `Get-Content -Raw src/data/generated/locations.json`
- `Get-Content -Raw src/data/items.ts`
- `Get-Content -Raw src/data/resolvedItems.ts`
- `Get-Content -Raw src/data/recipes.ts`
- `Get-Content -Raw src/data/equipmentCatalog.ts`
- `Get-Content -Raw src/features/crafting/CraftingScreen.tsx`
- `Get-Content -Raw src/features/inventory/InventoryScreen.tsx`
- `Get-Content -Raw scripts/validateData.mjs`
- `Get-Content -Raw src/game/types.ts`
- `Get-Content -Raw src/game/createInitialHero.ts`
- `Get-Content -Raw src/game/save/saveSystem.ts`
- `Get-Content -Raw src/game/save/cloudSaveSanitizer.ts`
- `Get-Content -Raw src/telegram/playerCloudSave.ts`
- `Get-ChildItem -Path src -Recurse -File | Where-Object { $_.Name -match 'save|Save|hero|Hero|types' } | Select-Object -ExpandProperty FullName`

## 1. Current System Audit

### How materials currently work

The current material system is a flat list in `src/data/generated/materials.json`. Each material already has useful metadata such as `tier`, `rarity`, `category`, `levelBand`, `levelRange`, `primaryUsage`, `source`, and `tags`.

What works well:

- Materials already support flavor and thematic identity.
- Materials already encode level range and rarity.
- The runtime item registry in `src/data/items.ts` merges materials into the same item resolution layer as equipment and support items.

What is unclear today:

- Material roles are mixed together in one flat namespace.
- Base, tier, faction, and catalyst concepts are present, but not modeled as distinct player-facing categories.
- The current five-tier material grouping does not align with the desired 11-step progression at levels `1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30`.
- Some refined materials and thematic drops overlap in purpose, which makes recipe readability weaker than it could be.

### How recipes currently work

There are two recipe realities in the repository:

- Generated handcrafted recipe JSONs:
  - `recipes.json`
  - `ringRecipes.json`
  - `shieldRecipes.json`
  - `amuletRecipes.json`
  - `minorArmorRecipes.json`
- Runtime crafting recipes from `src/data/equipmentCatalog.ts`, re-exported through `src/data/recipes.ts`

The runtime game currently uses `equipmentRecipes` from `equipmentCatalog.ts`. That layer already defines a clean 11-step equipment progression at levels:

- `1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30`

The generated recipe JSON files contain richer handcrafted content, but they are not the primary live recipe source for the current crafting screen. This split is the biggest structural issue in the current system.

### How recipe drops currently work

Recipe drops are split across multiple data files:

- `recipeDrops.json`
- `ringRecipeDrops.json`
- `shieldRecipeDrops.json`
- `amuletRecipeDrops.json`
- `minorArmorRecipeDrops.json`

Current issues:

- Recipe drop authoring is fragmented by slot family.
- Source references are mostly free-text names rather than normalized source IDs.
- Drop chances are stored as strings and appear to use percentage-style values in many cases.
- At least one file contains a placeholder separator row, which shows the data shape is still spreadsheet-oriented rather than game-system-oriented.

### How the crafting UI currently displays recipes

`src/features/crafting/CraftingScreen.tsx` uses runtime `recipes` plus several hardcoded helper maps and heuristics:

- hardcoded purpose text for `REC_001` to `REC_030`
- heuristic slot detection
- handcrafted output summaries
- a live affix preview model through runtime crafting logic

The UI can already:

- show known recipes
- preview result names and costs
- check player materials and gold
- craft generated equipment
- add affixes to crafted equippables

Current UI weakness:

- a meaningful part of recipe presentation is not data-driven
- the screen mixes legacy handcrafted recipe assumptions with the newer generated equipment recipe system

### Problems in the current system

- There are effectively two crafting content models: generated JSON recipe families and the runtime equipment catalog.
- Materials are flavorful but not organized into clear player-facing buckets.
- Recipe drop sources are fragmented and loosely normalized.
- The 5-tier material model does not match the intended 11-step equipment progression.
- The crafting screen relies on hardcoded recipe metadata that will not scale cleanly.
- Inventory currently treats materials as generic items and does not explain their source/use clearly enough.
- Save compatibility risk exists because hero inventory stores raw material IDs and `knownRecipeIds`.

## 2. Proposed New Material Categories

The redesign should keep the existing item-ID-based inventory model, but introduce a stronger conceptual schema for materials.

### Base materials

Purpose:
Common crafting backbone used in nearly every recipe of the matching progression band.

Drop source:
Common enemies in the relevant early or midgame zones.

Crafting use:
Baseline cost for weapons, armor, shields, and basic jewelry.

Rarity:
`common`

Expected level range:

- early base: `1-9`
- mid base: `9-21`
- late base: `21-30`

Examples of future roles:

- cloth/fiber line
- leather/hide line
- scrap/ore line

### Tier materials

Purpose:
The main progression gate that tells the player, "this is the material for the next item step."

Drop source:
Location band enemies, notable loot, and guaranteed location progression sources.

Crafting use:
Required in almost all recipes for a specific level breakpoint.

Rarity:
mostly `common` to `uncommon`

Expected level range:

- tier 1: level `1`
- tier 2: level `3`
- tier 3: level `6`
- tier 4: level `9`
- tier 5: level `12`
- tier 6: level `15`
- tier 7: level `18`
- tier 8: level `21`
- tier 9: level `24`
- tier 10: level `27`
- tier 11: level `30`

Recommendation:

- Model tier materials directly against the 11 equipment breakpoints, not the current 5-tier material grouping.

### Faction or thematic materials

Purpose:
Make recipes feel tied to enemy families and locations.

Drop source:
Specific enemy families, faction elites, or location-associated sources.

Crafting use:

- alternate slot identity
- optional recipe variants
- mid/high-tier gating for specialized items

Rarity:
`uncommon` to `rare`

Expected level range:
all bands, but especially `6-30`

Examples of role patterns:

- raider insignias and marks for aggressive gear
- cult ash fragments for occult or affix-heavy gear
- beast parts for mobility, crit, bleed, or dodge-oriented gear

### Rarity catalysts

Purpose:
Gate higher rarity outputs and stronger affix behavior without forcing huge increases in base material costs.

Drop source:
Elites, bosses, notable loot, and rare location drops.

Crafting use:

- uncommon catalyst for uncommon output
- rare catalyst for rare output
- epic catalyst for epic output
- optional reroll or affix stabilization systems later

Rarity:
`rare` to `legendary`

Expected level range:

- uncommon catalyst use starts around `6`
- rare catalyst use starts around `12`
- epic catalyst use starts around `18`
- endgame catalyst use concentrates at `24-30`

### Boss or elite materials

Purpose:
Create memorable capstone recipes and preserve boss identity.

Drop source:
Bosses, key elites, milestone encounters.

Crafting use:

- unique slot crafts
- boss-themed upgrades
- recipe unlock prerequisites
- late-game affix or rarity enablers

Rarity:
`rare`, `epic`, or `legendary`

Expected level range:
mostly `12-30`

## 3. Proposed Crafting Progression

The progression should align all craftable equipment to the same 11-step ladder already present in `equipmentCatalog.ts`.

### Target level ladder

- level `1`
- level `3`
- level `6`
- level `9`
- level `12`
- level `15`
- level `18`
- level `21`
- level `24`
- level `27`
- level `30`

### Progression rule

Each level step should require:

- one base material family
- one tier material for that exact step
- one thematic material for identity
- a catalyst only when rarity rises above baseline

### Recommended recipe cost scaling

Level `1`
- 2-3 base materials
- 1 tier material
- 0 thematic requirement for starter recipes
- 8-15 gold

Level `3`
- 3-4 base materials
- 1-2 tier materials
- 1 light thematic material
- 15-25 gold

Level `6`
- 4-5 base materials
- 2 tier materials
- 1 thematic material
- optional uncommon catalyst for uncommon outputs
- 25-40 gold

Level `9`
- 5-6 base materials
- 2 tier materials
- 1-2 thematic materials
- 35-55 gold

Level `12`
- 6-7 base materials
- 2-3 tier materials
- 2 thematic materials
- rare catalyst starts appearing for rare outputs
- 50-75 gold

Level `15`
- 7-8 base materials
- 3 tier materials
- 2 thematic materials
- 1 catalyst on rarer recipes
- 70-100 gold

Level `18`
- 8-10 base materials
- 3 tier materials
- 2-3 thematic materials
- catalyst expected on non-common outputs
- 95-135 gold

Level `21`
- 10-12 base materials
- 4 tier materials
- 2-3 thematic materials
- 1 catalyst minimum on advanced recipes
- 125-170 gold

Level `24`
- 12-14 base materials
- 4 tier materials
- 3 thematic materials
- 1-2 catalysts
- 160-220 gold

Level `27`
- 14-16 base materials
- 5 tier materials
- 3 thematic materials
- 1-2 advanced catalysts
- 210-280 gold

Level `30`
- 16-20 base materials
- 5-6 tier materials
- 3-4 thematic materials
- 2 catalysts and optional boss material
- 275-360 gold

Planning note:

- These are structure targets, not balance numbers to ship unchanged.
- The implementation pass should tune against actual player gold and drop income.

## 4. Equipment Crafting Rules

### Weapons

Materials:
- metal or weapon-core base materials
- tier material
- faction material for identity
- catalysts on rarer outputs

Random affixes:
- yes

Rarity effect:
- common: 0-1 affix
- uncommon: 1 affix
- rare: 1-2 affixes
- epic: 2-3 affixes

Boss or faction materials:
- faction materials often
- boss materials for signature late-game weapons

### Shields

Materials:
- metal base
- tier material
- defensive thematic material
- catalyst on rare and above

Random affixes:
- yes, defensive pool weighted

Rarity effect:
- prioritize block, armor, max HP, damage reduction

Boss or faction materials:
- recommended for fortress, legion, or guardian-themed shields

### Head

Materials:
- leather, cloth, or metal depending on armor fantasy
- tier material
- light thematic material

Random affixes:
- yes

Rarity effect:
- defensive or utility affixes

Boss or faction materials:
- optional except for capstone recipes

### Chest

Materials:
- highest base-material demand among armor slots
- tier material
- faction material when item identity is strong

Random affixes:
- yes

Rarity effect:
- most stable defensive scaling

Boss or faction materials:
- often for rare and epic chest pieces

### Hands

Materials:
- lighter armor materials
- tier material
- precision or utility thematic material

Random affixes:
- yes

Rarity effect:
- accuracy, speed, crit-support, utility

Boss or faction materials:
- not usually required before late game

### Legs

Materials:
- medium armor base materials
- tier material
- health or endurance thematic material

Random affixes:
- yes

Rarity effect:
- HP, armor, endurance, secondary defense

Boss or faction materials:
- optional until high-tier recipes

### Feet

Materials:
- leather or light armor base materials
- tier material
- mobility-themed faction material

Random affixes:
- yes

Rarity effect:
- dodge, speed-support, utility

Boss or faction materials:
- optional except for signature late-game mobility gear

### Rings

Materials:
- jewelry base material
- tier material
- strong thematic material
- catalyst more common than armor slots

Random affixes:
- yes, build-defining

Rarity effect:
- higher rarity should increase affix count and affix quality

Boss or faction materials:
- often, especially from midgame onward

### Amulets

Materials:
- jewelry base material
- tier material
- occult, noble, cult, or relic-themed materials
- catalysts on most non-common outputs

Random affixes:
- yes

Rarity effect:
- stronger primary stat identity and utility rolls

Boss or faction materials:
- strongly recommended for high-tier and boss-themed amulets

## 5. Drop Source Plan

### Common enemies

Should primarily drop:

- base materials
- low-tier progression materials
- occasional slot-themed materials for the local zone

Design goal:

- players should always feel they are earning something useful toward their next craft

### Elite enemies

Should primarily drop:

- larger quantities of tier materials
- uncommon thematic materials
- low-rate catalysts
- recipe drops for the current or next tier band

### Bosses

Should primarily drop:

- boss-specific materials
- guaranteed or highly reliable catalysts
- signature recipe drops
- notable loot tied to boss identity

### Location notable loot

Should support:

- guaranteed one-time crafting progression nudges
- first-copy recipe acquisition
- thematic crafting bundles

### Recipe drops

Recipe drop structure should be unified into one normalized dataset with:

- recipe id
- source type
- source id
- source name override if needed
- drop chance
- tier band
- slot family

Recommended source rules:

- common recipes: auto-known or location reward
- uncommon recipes: elites and notable loot
- rare recipes: bosses, milestones, hidden notable loot

### Crafting-specific drops

Future-safe optional source types:

- salvage output from unwanted gear
- quest rewards
- event rewards
- forge contracts or blacksmith tasks

## 6. Save Compatibility Plan

Do not delete old materials or old recipe ids during the first rollout.

Recommended approach:

- keep old materials as legacy materials initially
- add a migration mapping table from legacy material ids to new crafting categories
- preserve display compatibility for old saves through the resolver layer
- migrate only when the player loads a save, and set a migration flag after successful normalization

### Suggested compatibility strategy

1. Keep all existing material IDs valid in `items.ts` and `resolvedItems.ts`.
2. Add a `legacyMaterialMap` that can:
   - remap old ids to new ids for crafting calculations
   - preserve old ids for display until consumed or converted
3. Preserve `knownRecipeIds` by:
   - keeping legacy recipe ids recognized
   - mapping legacy ids to replacement recipe ids where needed
4. Add a save migration flag in `HeroState.migrationFlags`.
5. Ensure cloud save sanitizer accepts both legacy and redesigned IDs during the transition window.

### Preferred migration behavior

- If an old material still exists, show it and let it remain usable.
- If an old material is deprecated, auto-map it to the nearest new category or exchange bucket.
- If a recipe was replaced, the player should keep equivalent unlock progress.

## 7. Implementation Steps

### 1. Data model changes

- Define explicit material category taxonomy.
- Define normalized recipe-drop schema.
- Define legacy mapping tables for material ids and recipe ids.

### 2. Material data changes

- Reclassify current materials into base, tier, thematic, catalyst, and boss buckets.
- Introduce 11-step tier alignment metadata.
- Keep legacy ids active until migration is proven safe.

### 3. Recipe changes

- Decide whether the source of truth is:
  - generated JSON recipe files
  - `equipmentCatalog.ts`
  - or a new unified recipe authoring layer
- Move recipe presentation metadata into data instead of hardcoded UI maps.
- Align all slot recipes to the 11-step progression ladder.

### 4. Recipe drop changes

- Merge split recipe-drop files into one normalized dataset or a single generated source pipeline.
- Replace free-text source strings with source ids where possible.
- Keep optional display names for Telegram-friendly wording.

### 5. Loot table changes

- Align material sources with the new material categories.
- Ensure every tier step has reliable progression drops.
- Ensure bosses and elites supply catalysts and signature materials consistently.

### 6. Crafting UI changes

- Remove hardcoded recipe-purpose mappings.
- Show clearer recipe previews:
  - item slot
  - rarity
  - expected affix behavior
  - required material categories
  - source hints for missing materials
- Show whether a recipe is common, elite, boss, or location-derived.

### 7. Inventory display changes

- Group materials by category and tier.
- Show material source hints and primary uses.
- Mark legacy materials clearly if they remain in saves.

### 8. Data validation update

- Validate normalized recipe-drop source ids.
- Validate legacy mapping tables.
- Validate every craftable output resolves in the item registry.
- Validate migration-safe acceptance of legacy ids.

### 9. Tests

- unit tests for material-id migration
- unit tests for recipe-id migration
- validator coverage for new datasets
- crafting UI rendering tests for new recipe metadata
- save load tests with old and new inventories

### 10. Migration and fallbacks

- implement load-time migration only after data is stable
- add migration flags
- add telemetry or debug logging for unmapped ids during testing
- preserve a fallback display path for unknown legacy materials

## 8. Risks

- broken saves if old material ids stop resolving
- broken known recipes if recipe ids are replaced without mapping
- recipes referencing removed or renamed materials
- loot tables referencing deprecated material buckets
- crafting UI showing unknown ids or blank source text
- cloud save sanitizer rejecting valid transitional data
- duplicated economy pressure if old and new material loops both remain active too long
- balance drift if catalysts replace too much of the base-material cost
- player confusion if legacy items stay visible without clear labeling

## Recommended Implementation Direction

The safest path is not to replace the entire crafting model at once.

Recommended rollout:

1. Choose a single recipe source of truth.
2. Add normalized material categories without removing legacy ids.
3. Add compatibility mapping in the resolver and save normalization path.
4. Move crafting UI text and source hints into data.
5. Rebuild recipe drops and loot around the unified model.
6. Tune balance only after the system structure is stable.

This keeps the redesign compatible with existing saves, matches the clean 11-step progression already present in `equipmentCatalog.ts`, and gives the crafting screen enough structured data to become clearer and more thematic without relying on hardcoded assumptions.
