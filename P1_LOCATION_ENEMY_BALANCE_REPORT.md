# P1 Location Enemy Balance Report

## 1. Source-of-Truth Confirmation
A comprehensive search was performed on the repository directories and git histories:
- No generator scripts, spreadsheet files (`.xlsx`), Python automation scripts, or external Obsidian sync targets are present in the active codebase workspace.
- The compiled database file `src/data/generated/enemies.json` functions as the **direct runtime source of truth** for all enemy definition statistics. Changes were applied directly to this file.
- The scaling logic remains untouched in `src/game/formulas/enemyScaling.ts`.
- The combat formulas remain untouched in `src/game/formulas/combat.ts`.

---

## 2. Before / After Difficulty Comparison Table (LOC_001–LOC_004)

Below is the difficulty curve audit comparison, presenting the min/max scaled stats before and after changes:

### BEFORE CHANGES
| Location ID | Location Name | Level Range | Risk Label | Enemy ID | Enemy Name | Base Level | Base HP | Scaled HP (Min / Max Level) | Base Damage | Scaled Damage (Min / Max Level) | Defense / Armor | Approx. Difficulty Score (Min / Max Level) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **LOC_001** | Broken Road Outskirts | 1–3 | Safe | `enemy_vael_thorn_rot_hound_001` | Thorn Rot Hound | 1 | 54 | 54 / 68 | 4–8 | 4–8 / 5–9 | 3 / 3 | 114 / 185 |
| | | | | `enemy_vael_blackfang_brigand_001` | Blackfang Brigand | 2 | 58 | 52 / 65 | 8–12 | 7–11 / 9–13 | 5 / 5 | 132 / 195 |
| **LOC_002** | Blackfang Forest | 3–6 | Risky/Dangerous | `enemy_01_young_wolf_001` | Young Wolf | 1 | 47 | 59 / 83 | 6–10 | 7–11 / 9–13 | 2 / 2 | 145 / 252 |
| | | | | `enemy_02_fang_stalker_006` | Fang Stalker | 2 | 55 | 62 / 87 | 7–11 | 8–12 / 10–14 | 2 / 2 | 165 / 274 |
| | | | | `enemy_04_young_wolf_016` | Young Wolf | 4 | 75 | 67 / 94 | 9–13 | 8–12 / 11–15 | 2 / 2 | 179 / 288 |
| | | | | `enemy_05_fang_stalker_021` | Fang Stalker | 5 | 85 | 68 / 95 | 10–14 | 8–11 / 11–15 | 2 / 2 | 185 / 295 |
| **LOC_003** | Raider Camp | 5–8 | Dangerous | `enemy_01_wild_raider_002` | Wild Raider | 1 | 62 | 98 / 137 | 8–12 | 11–16 / 14–20 | 4 / 4 | 224 / 358 |
| | | | | `enemy_02_blood_raider_007` | Blood Raider | 2 | 70 | 98 / 138 | 9–13 | 11–16 / 14–20 | 4 / 4 | 231 / 366 |
| | | | | `enemy_03_savage_marauder_012` | Savage Marauder | 3 | 80 | 100 / 141 | 10–14 | 12–16 / 15–20 | 5 / 5 | 247 / 384 |
| **LOC_004** | Old Watchtower | 7–10 | Dangerous | `enemy_01_iron_guard_003` | Iron Guard | 1 | 77 | 152 / 213 | 10–14 | 16–22 / 20–28 | 6 / 6 | 315 / 486 |
| | | | | `enemy_02_shield_veteran_008` | Shield Veteran | 2 | 85 | 150 / 210 | 11–15 | 16–22 / 20–28 | 7 / 7 | 325 / 496 |

### AFTER CHANGES
| Location ID | Location Name | Level Range | Risk Label | Enemy ID | Enemy Name | Base Level | Base HP | Scaled HP (Min / Max Level) | Base Damage | Scaled Damage (Min / Max Level) | Defense / Armor | Approx. Difficulty Score (Min / Max Level) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **LOC_001** | Broken Road Outskirts | 1–3 | Safe | `enemy_vael_thorn_rot_hound_001` | Thorn Rot Hound | 1 | 38 | 38 / 48 | 3–5 | 3–5 / 3–6 | 0 / 0 | 76 / 112 |
| | | | | `enemy_vael_blackfang_brigand_001` | Blackfang Brigand | 2 | 46 | 41 / 52 | 4–7 | 4–6 / 4–8 | 1 / 1 | 91 / 131 |
| **LOC_002** | Blackfang Forest | 3–6 | Risky/Dangerous | `enemy_01_young_wolf_001` | Young Wolf | 1 | 52 | 65 / 92 | 6–10 | 7–11 / 9–13 | 2 / 2 | 153 / 264 |
| | | | | `enemy_02_fang_stalker_006` | Fang Stalker | 2 | 55 | 62 / 87 | 7–11 | 8–12 / 10–14 | 2 / 2 | 165 / 274 |
| | | | | `enemy_04_young_wolf_016` | Young Wolf | 4 | 75 | 67 / 94 | 9–13 | 8–12 / 11–15 | 2 / 2 | 179 / 288 |
| | | | | `enemy_05_fang_stalker_021` | Fang Stalker | 5 | 85 | 68 / 95 | 10–14 | 8–11 / 11–15 | 2 / 2 | 185 / 295 |
| **LOC_003** | Raider Camp | 5–8 | Dangerous | `enemy_01_wild_raider_002` | Wild Raider | 1 | 62 | 98 / 137 | 8–12 | 11–16 / 14–20 | 4 / 4 | 224 / 358 |
| | | | | `enemy_02_blood_raider_007` | Blood Raider | 2 | 70 | 98 / 138 | 9–13 | 11–16 / 14–20 | 4 / 4 | 231 / 366 |
| | | | | `enemy_03_savage_marauder_012` | Savage Marauder | 3 | 80 | 100 / 141 | 10–14 | 12–16 / 15–20 | 5 / 5 | 247 / 384 |
| **LOC_004** | Old Watchtower | 7–10 | Dangerous | `enemy_01_iron_guard_003` | Iron Guard | 1 | 77 | 152 / 213 | 10–14 | 16–22 / 20–28 | 6 / 6 | 315 / 486 |
| | | | | `enemy_02_shield_veteran_008` | Shield Veteran | 2 | 85 | 150 / 210 | 11–15 | 16–22 / 20–28 | 7 / 7 | 325 / 496 |

---

## 3. Exact Changes Made

### File modified: `src/data/generated/enemies.json`
- **`enemy_vael_thorn_rot_hound_001`**:
  - `hp`: `54` -> `38`
  - `damageMin`: `4` -> `3`
  - `damageMax`: `8` -> `5`
  - `attack`: `9.0` -> `6.0`
  - `armor`: `3` -> `0`
  - `defense`: `3` -> `0`
  - `poise`: `3` -> `1`
- **`enemy_vael_blackfang_brigand_001`**:
  - `hp`: `58` -> `46`
  - `damageMin`: `8` -> `4`
  - `damageMax`: `12` -> `7`
  - `attack`: `9.0` -> `7.0`
  - `armor`: `5` -> `1`
  - `defense`: `5` -> `1`
  - `poise`: `7` -> `3`
- **`enemy_01_young_wolf_001`**:
  - `hp`: `47` -> `52`

*No changes were made to combat code, scaling algorithms, formulas, or save schemas. The data files were edited directly.*

---

## 4. Validation Results
- **TypeScript Compile (`tsc -b`)**: `Passed` (No type errors)
- **Lint Check (`eslint .`)**: `Passed` (Only standard pre-existing warnings in crafting, 0 errors)
- **Unit Tests (`vitest`)**: `Passed` (All 91 tests passed successfully)
- **Production Build (`vite build`)**: `Passed` (Assets built cleanly into `dist/`)

---

## 5. Remaining Risks
- **Elite Roll Spikes**: There remains an 8% chance in `LOC_001` to spawn an Elite variation (e.g. `Blood-Starved` or `Ironbound`). With scaled status, this elite enemy will scale its HP by `2.2` and damage by `1.5`, making it a tough fight for level 1 characters. This is expected behavior for elite encounters, but could still surprise players.
- **Hero Gear Dependency**: Players who do not equip their starting weapons/armor presets immediately will face challenges, but the difficulty at `LOC_001` is now perfectly balanced for a basic unequipped hero state (difficulty index ~76–131 compared to the previous ~114–195).
