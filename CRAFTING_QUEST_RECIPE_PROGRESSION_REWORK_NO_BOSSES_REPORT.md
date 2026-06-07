# Crafting Quest & Recipe Progression Rework (No Bosses) Report

This report outlines the structural changes, progression design, math formulas, and validation results of the crafting progression rework.

---

## 1. Former Boss Recipe Unlocks Replaced

To completely eliminate the dependency of recipe progression on bosses, all level 27 and 30 recipes (which previously required boss drops) have been updated to either **Elite Drops** or **Quest Rewards**:

| Equipment Slot | Level 27 Former Unlock | Level 27 Reworked Unlock | Level 30 Former Unlock | Level 30 Reworked Unlock |
| :--- | :--- | :--- | :--- | :--- |
| **Weapon** | Boss | `elite` (Ironbound Breaker / Quarry Breaker Spawn) | Boss | `quest` (Guaranteed Quest Reward) |
| **Shield** | Boss | `elite` (Arena Duelist / Arena Champion Spawn) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |
| **Head** | Boss | `elite` (Arena Duelist / Arena Champion Spawn) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |
| **Chest** | Boss | `quest` (Guaranteed Quest Reward) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |
| **Hands** | Boss | `elite` (Arena Duelist / Arena Champion Spawn) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |
| **Legs** | Boss | `elite` (Arena Duelist / Arena Champion Spawn) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |
| **Feet** | Boss | `elite` (Arena Duelist / Arena Champion Spawn) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |
| **Ring** | Boss | `elite` (Arena Duelist / Arena Champion Spawn) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |
| **Amulet** | Boss | `elite` (Arena Duelist / Arena Champion Spawn) | Boss | `elite` (Elite Spawn / Ash Fang Zealot) |

---

## 2. Recipes Guaranteed by Quests

The curated crafting quest chain consists of 11 quests (in Ukrainian) spanning levels 1 to 27, ensuring progression coverage across all 9 slots (weapon, shield, head, chest, hands, legs, feet, ring, amulet):

*   **Quest 1 (Level 1)**: `recipe_weapon_blade_lvl_03`
*   **Quest 2 (Level 3)**: `recipe_shield_guard_lvl_06`
*   **Quest 3 (Level 5)**: `recipe_head_helmet_lvl_06` & `recipe_feet_boots_lvl_03`
*   **Quest 4 (Level 7)**: `recipe_chest_armor_lvl_09`
*   **Quest 5 (Level 10)**: `recipe_hands_gloves_lvl_12`
*   **Quest 6 (Level 12)**: `recipe_legs_pants_lvl_15`
*   **Quest 7 (Level 15)**: `recipe_ring_band_lvl_18`
*   **Quest 8 (Level 18)**: `recipe_amulet_charm_lvl_21`
*   **Quest 9 (Level 21)**: `recipe_weapon_blade_lvl_24`
*   **Quest 10 (Level 24)**: `recipe_chest_armor_lvl_27`
*   **Quest 11 (Level 27)**: `recipe_weapon_blade_lvl_30`

---

## 3. Recipes Remaining as Enemy/Elite Drops

Recipes not included in starters or the quest-reward sets remain as combat drops. Pity accumulates only for these recipes:

*   **Normal Drops (`drop`)**: 
    *   **Weapon**: Lvl 9, 12, 15
    *   **Shield**: Lvl 3, 9, 12, 15
    *   **Head**: Lvl 3, 9, 12, 15
    *   **Chest**: Lvl 3, 6, 12, 15, 18
    *   **Hands**: Lvl 3, 6, 9, 15
    *   **Legs**: Lvl 3, 6, 9, 12
    *   **Feet**: Lvl 6, 9, 12, 15
    *   **Ring**: Lvl 1, 3, 6, 9, 12, 15
    *   **Amulet**: Lvl 1, 3, 6, 9, 12, 15
*   **Elite Drops (`elite`)**:
    *   **Weapon**: Lvl 18, 21, 27
    *   **Shield**: Lvl 18, 21, 24, 27, 30
    *   **Head**: Lvl 18, 21, 24, 27, 30
    *   **Chest**: Lvl 21, 24, 30
    *   **Hands**: Lvl 18, 21, 24, 27, 30
    *   **Legs**: Lvl 18, 21, 24, 27, 30
    *   **Feet**: Lvl 18, 21, 24, 27, 30
    *   **Ring**: Lvl 21, 24, 27, 30
    *   **Amulet**: Lvl 18, 24, 27, 30

---

## 4. Recipe Drop Pity Formula & Eligibility

### Eligibility Rules
Pity record counts (`recipeDropPity`) accumulate **only** if:
1. The recipe matches the defeated enemy and the current location.
2. The recipe is not already known by the player.
3. The recipe is not a starter recipe.
4. The recipe is not quest-only (`unlockType !== 'quest'`).

### Formula
For each eligible candidate, the drop check uses an modified chance:
$$\text{pityBonus} = \text{failedAttempts} \times 0.5\%$$
$$\text{effectiveChance} = \min(\text{baseChance} + \text{pityBonus}, \text{baseChance} + 10\%)$$

Once a recipe drops, its pity count resets to `0`.

---

## 5. Material Source Strategy

*   **Location-Aware Loot Pools**: `rollLootDrop` accepts the `Location` record. If the location specifies a subset of materials in `location.materials`, the loot roll is restricted to those materials (matching the theme of the area).
*   **Fallback Safety**: If no location matches or if the subset resolves to an empty list, the formula rolls materials from the global material list matching the enemy's level tier.
*   **Call Sites Updated**: In `combatRewards.ts`, the `currentLocation` is explicitly passed to `rollLootDrop` to ensure the location-appropriate rules apply during victories.

---

## 6. Crafted Item Rarity Ranks

Crafted equipment rolls its rarity at craft time using a customizable random generator (allowing complete deterministic mock injection for unit testing):

| Rarity | Default Table (Normal Mats) | Improved Table (Catalyst / Rare Mats) |
| :--- | :--- | :--- |
| **Common** | 65% ($\text{roll} \ge 35$) | 45% ($\text{roll} \ge 55$) |
| **Uncommon** | 25% ($10 \le \text{roll} < 35$) | 35% ($20 \le \text{roll} < 55$) |
| **Rare** | 8% ($2 \le \text{roll} < 10$) | 15% ($5 \le \text{roll} < 20$) |
| **Epic** | 2% ($\text{roll} < 2$) | 5% ($\text{roll} < 5$) |

---

## 7. Verification & Build Command Results

*   **Typecheck**: Passed cleanly with `tsc -b`.
*   **Linter**: Passed cleanly with `eslint .`.
*   **Unit Tests**: All 152 vitest unit tests completed successfully.
*   **Data Validation (`npm run validate:data`)**: Exits with 0 error codes, validating no `unlockType: "boss"` remains in live templates and confirming correct `'quest'` parameters.
*   **Client Build (`npm run build`)**: Vite builds successfully for production.
