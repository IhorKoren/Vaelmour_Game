# Crafting Redesign Phase 4: Progression & Drop Balance Report

## 1. Overview

This report details the audit, findings, and resolutions implemented during **Phase 4: Crafting Progression & Drop Balance Audit**. 

The goal of this phase was to ensure that all live crafting recipes in the game are realistically obtainable, unlockable, and craftable at their intended progression stages. This involved aligning recipe level requirements with the zones, enemies, and level ranges where their required crafting materials and recipe drop unlocks are acquired.

---

## 2. Recipe Progression Table & Findings

Below is the progression analysis map of recipes against materials, demonstrating their required level and the minimum zone level where their materials are acquired.

| Recipe ID | Recipe Name | Req. Level | Material Code | Material Name | Min. Drop Zone | Zone Min. Level | Progression Alignment Status |
|---|---|---|---|---|---|---|---|
| **REC_RING_NEW_001** | Copper Ring | 1 | MAT_004 | Wolf Fang | LOC_001 | 1 | **Aligned** (Originally MAT_005 at level 5, fixed) |
| **REC_RING_NEW_002** | Bronze Ring | 3 | MAT_004 | Wolf Fang | LOC_001 | 1 | **Aligned** (Originally MAT_005 at level 5, fixed) |
| **REC_RING_NEW_008** | Jade Ring | 17 | MAT_015 | Raven Feather | LOC_006 | 15 | **Aligned** (Originally MAT_018 at level 23, fixed) |
| **REC_FEET_NEW_008** | Steel Boots | 17 | MAT_015 | Raven Feather | LOC_006 | 15 | **Aligned** (Originally MAT_018 at level 23, fixed) |
| **REC_HANDS_NEW_008** | Steel Gloves | 17 | MAT_013 | Tempered Iron Bar | LOC_005 | 13 | **Aligned** (Originally MAT_018 at level 23, fixed) |
| **REC_AMULET_NEW_004**| Guardian Amulet | 7 | MAT_009 | Guard Insignia | LOC_003 | 7 | **Aligned** (Originally MAT_010 at level 11, fixed) |
| **REC_010** | Iron Sigil | 5 | MAT_008, MAT_007 | Bear Claw, Boar Hide | LOC_002, LOC_001 | 4, 1 | **Aligned** (Originally MAT_016/MAT_024 at level 19, fixed) |

---

## 3. Unlock Path Alignment Findings

The newly added validation rules caught several mismatch errors between recipe unlock levels and the minimum level ranges of the zones in which they dropped. These have been aligned as follows:

| Recipe ID | Slot | Level Step | Original Zone | Original Min Level | New Zone | New Min Level | Alignment Status |
|---|---|---|---|---|---|---|---|
| **recipe_ring_band_lvl_03** | Ring | 3 | LOC_003 | 5 | **LOC_002** | 3 | **Fixed & Aligned** |
| **recipe_ring_band_lvl_06** | Ring | 6 | LOC_004 | 7 | **LOC_003** | 5 | **Fixed & Aligned** |
| **recipe_ring_band_lvl_24** | Ring | 24 | LOC_013 | 25 | **LOC_012** | 23 | **Fixed & Aligned** |
| **recipe_amulet_charm_lvl_03** | Amulet | 3 | LOC_004 | 7 | **LOC_002** | 3 | **Fixed & Aligned** |
| **recipe_amulet_charm_lvl_06** | Amulet | 6 | LOC_006 | 11 | **LOC_003** | 5 | **Fixed & Aligned** |
| **recipe_amulet_charm_lvl_09** | Amulet | 9 | LOC_006 | 11 | **LOC_005** | 9 | **Fixed & Aligned** |
| **recipe_amulet_charm_lvl_12** | Amulet | 12 | LOC_007 | 13 | **LOC_006** | 11 | **Fixed & Aligned** |
| **recipe_amulet_charm_lvl_24** | Amulet | 24 | LOC_013 | 25 | **LOC_012** | 23 | **Fixed & Aligned** |
| **recipe_shield_guard_lvl_06** | Shield | 6 | LOC_004 | 7 | **LOC_003** | 5 | **Fixed & Aligned** |
| **recipe_shield_guard_lvl_24** | Shield | 24 | LOC_013 | 25 | **LOC_012** | 23 | **Fixed & Aligned** |
| **recipe_head_helmet_lvl_06** | Head | 6 | LOC_004 | 7 | **LOC_003** | 5 | **Fixed & Aligned** |
| **recipe_head_helmet_lvl_24** | Head | 24 | LOC_013 | 25 | **LOC_012** | 23 | **Fixed & Aligned** |
| **recipe_hands_gloves_lvl_06** | Hands | 6 | LOC_004 | 7 | **LOC_003** | 5 | **Fixed & Aligned** |
| **recipe_hands_gloves_lvl_24** | Hands | 24 | LOC_013 | 25 | **LOC_012** | 23 | **Fixed & Aligned** |
| **recipe_legs_pants_lvl_06** | Legs | 6 | LOC_004 | 7 | **LOC_003** | 5 | **Fixed & Aligned** |
| **recipe_legs_pants_lvl_24** | Legs | 24 | LOC_013 | 25 | **LOC_012** | 23 | **Fixed & Aligned** |
| **recipe_feet_boots_lvl_06** | Feet | 6 | LOC_004 | 7 | **LOC_003** | 5 | **Fixed & Aligned** |
| **recipe_feet_boots_lvl_24** | Feet | 24 | LOC_013 | 25 | **LOC_012** | 23 | **Fixed & Aligned** |

---

## 4. Exact List of Changes Made

### A. Scripts & Validators
- **[validateData.mjs](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/scripts/validateData.mjs)**:
  - Integrated `materialLootData` and `locationLootData` arrays into the material drop level ranges resolution block.
  - Tracked `hasRealSource` explicitly for all non-legacy materials.
  - Added warnings for unresolved spawn pool enemy/boss names instead of silently skipping them.
  - Added strict checks to verify `locationId` exists and that locations are not unlocked later than the recipe required level.
  - Added check verifying specific enemies spawn in the correct location spawn pool or boss drop.

### B. Recipe Catalog Corrections
- **[recipeDropSources.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/data/recipeDropSources.ts)**:
  - Aligned level 3, 6, and 24 ring and amulet recipe unlocks with early/mid/late zone levels (`LOC_002`, `LOC_003`, `LOC_005`, `LOC_006`, `LOC_012`).
  - Aligned level 6 and 24 shield, head, hands, legs, and feet recipe unlocks with appropriate level-valid zones (`LOC_003`, `LOC_012`).

### C. Testing Updates
- **[recipeDropSources.test.ts](file:///c:/Users/h1sok/OneDrive/Робочий%20стіл/Vaelmour/Vaelmour_Game/src/data/recipeDropSources.test.ts)**:
  - Confirmed starter recipe exclusions from known lists.
  - Verified Ring Level 1 and Amulet Level 1 remain active in the crafting pool.

---

## 5. Remaining Warnings
No progression or material-reachability warnings remain. The remaining warnings in validation relate to:
- `spawnPools` warnings for custom zones containing references to unresolved legacy/placeholder enemy names.
- `unused` warning flags for legacy armor/recipes left active for backwards compatibility.

---

## 6. Validation Results
- **Data Validation**: **Passed** (`npm run validate:data`)
- **Type Checking**: **Passed** (`npm run typecheck`)
- **Linting**: **Passed** (`npm run lint`)
- **Tests**: **Passed** (129/129 tests, `npm run test`)
- **Production Build**: **Passed** (`npm run build`)
