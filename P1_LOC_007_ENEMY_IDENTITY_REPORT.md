# P1_LOC_007_ENEMY_IDENTITY_REPORT

## Source-of-Truth Confirmation
We confirmed that the generated JSON files in `src/data/generated/` are direct runtime database files.
The files modified are:
- `src/data/generated/enemies.json`
- `src/data/generated/locations.json`
- `src/data/amuletLoot.ts`
- `src/data/generated/amuletRecipeDrops.json`

No modifications were made to combat architecture, combat formulas, scaling formulas, reward formulas, save schemas, Telegram logic, equipment stats, or item IDs.

---

## Verification of Loot Resolution Logic
- **Loot Tables (`lootTables.json`)**: We inspected the loot rolling logic (`rollLootDrop` and `getEnemyGoldReward`). `rollLootDrop` rolls materials dynamically based on the enemy level relative to `availableItems` and does not use `lootTable` property lookups. Gold calculation uses `enemy.name` to match entries in `enemyLoot`. Any missing entries safely fall back to the `gold` property defined directly on the enemy in `enemies.json`.
- **Drops_from Matching**: Verified that unique item and recipe drop systems match by string matching against `enemy.name` (the display name). Thus, using `"Mercenary Swordsman"`, `"Crossroad Duelist"`, and `"Veteran Sellblade"` in the drop tables matches the newly added runtime enemies exactly.

---

## BEFORE and AFTER LOC_007 Tables

### BEFORE Table
* **Location ID**: `LOC_007`
* **Location Name**: `Mercenary Crossroads`
* **Level Range**: `13–16`
* **Risk Level**: `Dangerous` (based on dynamic formulas)
* **Active Spawning Enemies**: `enemy_01_wild_raider_002` ... `enemy_28_wild_raider_137`
* **Active Enemy Names**: `Wild Raider`
* **Enemy Base Levels**: `1–28`
* **Scaled HP/Damage (at Lvl 13–16)**: `192–239 HP` / `20–29 Damage`
* **Current Loot/Theme**: `Mercenary Luck Talisman`, `Sellblade Oath Ring`, `Sellblade Armor Parts`
* **Mismatch Issues**: Named *Mercenary Crossroads* but only raiders spawned. Mercenary items dropped from raiders.

### AFTER Table
* **Location ID**: `LOC_007`
* **Location Name**: `Mercenary Crossroads`
* **Level Range**: `13–16`
* **Active Spawning Enemies**: 
  * `enemy_vael_mercenary_swordsman_001` (`Mercenary Swordsman`)
  * `enemy_vael_crossroad_duelist_001` (`Crossroad Duelist`)
  * `enemy_vael_veteran_sellblade_001` (`Veteran Sellblade`)
* **Enemy Theme**: `Mercenary / Fighter`
* **Base Levels**: `13`
* **Scaled HP/Damage (Min Lvl 13 / Max Lvl 16)**:
  * `Mercenary Swordsman`: `180–253 HP` / `18–22` to `23–28` Damage
  * `Crossroad Duelist`: `185–260 HP` / `19–23` to `24–29` Damage
  * `Veteran Sellblade`: `192–270 HP` / `20–24` to `25–30` Damage
* **Loot/Recipe Associations**: `Mercenary Luck Talisman`, `Sellblade Oath Ring`, `Sellblade Armor Parts` are now drop-associated with these spawning mercenary enemies.
* **Drop Confirmation**: Confirmed that `Mercenary Luck Talisman` and its recipe `REC_AMULET_NEW_006` are associated with `Mercenary Swordsman` (which now actively spawns at runtime in `LOC_007`). Other Sellblade gear drops from `Veteran Sellblade` and `Crossroad Duelist` (both now actively spawn at runtime).

---

## Difficulty Scaling Verification
- **LOC_006 Baseline**: `Young Wolf` (HP 177, Dmg 18–22).
- **LOC_007 Baseline**: `Mercenary Swordsman` (HP 180, Dmg 18–22), `Crossroad Duelist` (HP 185, Dmg 19–23), `Veteran Sellblade` (HP 192, Dmg 20–24).
- **LOC_008 Baseline**: `Executioner` (HP 212, Dmg 23–29).
- **Scaled Max Comparison**:
  - `LOC_006` (Lvl 14): `Blood Priest` max HP scaled = `211`.
  - `LOC_007` (Lvl 16): `Veteran Sellblade` max HP scaled = `270`.
  - `LOC_008` (Lvl 18): `Pit Crusher` max HP scaled = `316`.
- **Difficulty Conclusion**: The difficulty curve is aligned. LOC_007 baseline is above LOC_006 baseline, LOC_007 scaled max is above LOC_006 scaled max, and LOC_007 scaled max remains below LOC_008 scaled max.

---

## Validation Results
We ran the standard validation suite:
- `npm run typecheck` (Success)
- `npm run lint` (Success, no errors)
- `npm run test` (Success, 91/91 tests passed)
- `npm run build` (Success)

---

## Chosen Fix Option
- **Option C**: Added 3 missing Mercenary enemies to the active runtime enemy database and changed `LOC_007` to spawn only them, removing `Wild Raider` from this zone.

## Remaining Risks
- The newly added enemies only exist at base level 13. While this is sufficient for LOC_007 (since the runtime scaling engine handles leveling them to 13–16), future tasks expanding locations or level bands may want to add multi-level instances of these mercenary enemies to the database.
