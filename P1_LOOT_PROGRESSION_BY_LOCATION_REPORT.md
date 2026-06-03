# P1_LOOT_PROGRESSION_BY_LOCATION_REPORT

## Source-of-Truth Confirmation
We confirmed that the generated JSON files in `src/data/generated/` are direct runtime database files.
The files modified are:
- `src/data/ringLoot.ts`
- `src/data/amuletLoot.ts`
- `src/data/shieldLoot.ts`
- `src/data/minorArmorLoot.ts`
- `src/data/generated/ringRecipeDrops.json`
- `src/data/generated/amuletRecipeDrops.json`

No modifications were made to combat architecture, combat formulas, save schema, enemy stats, or equipment stat formulas.

---

## Verification of LOC_007 Enemies
During audit verification, we identified that **`Veteran Sellblade`** and **`Crossroad Duelist`** do not exist as active runtime enemies in `enemies.json`.
- **Exact Valid LOC_007 Enemy Used**: **`Wild Raider`** (which spawns dynamically in `LOC_007` and is defined in `enemies.json`).
- **Invalid non-runtime enemies** (`Veteran Sellblade` and `Crossroad Duelist`) **were not used** to avoid breaking recipe drops.
- **Note on LOC_007 enemy identity mismatch**: `LOC_007` is named *Mercenary Crossroads* but currently spawns `Wild Raider` variants. A follow-up task should audit `LOC_007` enemy identity/spawn pools to eventually add/replace proper Mercenary enemies.

---

## BEFORE and AFTER Loot Progression Table (LOC_001–LOC_006)

### BEFORE Table
| Location ID | Location Name | Level | Risk Level | Notable Rings | Notable Amulets | Notable Shields | Notable Minor Armors | Notable Recipes | Quality |
|---|---|---|---|---|---|---|---|---|---|
| **LOC_001** | Broken Road Outskirts | 1–3 | Safe | Traveler's Ring, Wolfbite Band | Wolf Fang Charm, Road Saint Pendant | Roadwatch Buckler, Splinterhide Guard | Roadside Hood, Scout Hood, Wraps | None | Starter |
| **LOC_002** | Blackfang Forest | 3–6 | Risky/Dangerous | Marauder's Iron Band | Iron Sigil | Blackfang Hide Shield | Raider Iron Cap, Blackfang Claws, Blackfang Boots | Blackfang Strap Vest, Wolfbite Hatchet | Early |
| **LOC_003** | Raider Camp | 5–8 | Dangerous | None | None | None | None | Raider Cleaver | Low |
| **LOC_004** | Old Watchtower | 7–10 | Dangerous | Countermark Ring | Ash-Touched Charm | Watchtower Kite Shield | Watch Captain Helm, Watchtower Bracers | Shield Veteran Mail, Countermark Ring | Mid-Early |
| **LOC_005** | Iron Bastion Approach | 9–12 | Dangerous/Extreme | Balanced Iron Ring | Blood Priest's Charm | Gatewarden Bastion | Ironmarch Visor, Ironbound Gauntlets | Balanced Iron Ring, Blood Priest's Charm | Mid-Early |
| **LOC_006** | Ashen Marsh | 11–14 | Extreme | Ash Resin Signet | Mercenary Luck Talisman | Ash-Riveted Bulwark | Ashen Veil Hood, Ash-Sealed Handwraps | Blood Priest's Dagger Charm | High |

### AFTER Table
| Location ID | Location Name | Level | Risk Level | Notable Rings | Notable Amulets | Notable Shields | Notable Minor Armors | Notable Recipes | Quality |
|---|---|---|---|---|---|---|---|---|---|
| **LOC_001** | Broken Road Outskirts | 1–3 | Safe | Traveler's Ring | Wolf Fang Charm | Roadwatch Buckler | Roadside Hood, Wraps, Boots | None | Tutorial |
| **LOC_002** | Blackfang Forest | 3–6 | Risky/Dangerous | Wolfbite Band | Road Saint Pendant | Splinterhide Guard, Blackfang Hide Shield | Scout Hood, Raider Grips, Boots | Blackfang Strap Vest, Wolfbite Hatchet | Level 4 Common |
| **LOC_003** | Raider Camp | 5–8 | Dangerous | Marauder's Iron Band | None | None | Raider Iron Cap, Claws, Greaves, Boots | Raider Cleaver, Marauder's Iron Band | Level 6 Uncommon |
| **LOC_004** | Old Watchtower | 7–10 | Dangerous | Countermark Ring | Iron Sigil | Watchtower Kite Shield | Watchtower Helm, Watchtower Bracers | Shield Veteran Mail, Countermark Ring, Iron Sigil | Level 8/6 Defender |
| **LOC_005** | Iron Bastion Approach | 9–12 | Dangerous/Extreme | Balanced Iron Ring | None | Gatewarden Bastion | Ironmarch Visor, Ironbound Gauntlets | Balanced Iron Ring | Level 11 Defender |
| **LOC_006** | Ashen Marsh | 11–14 | Extreme | Ash Resin Signet | Ash-Touched Charm, Blood Priest's Charm | Ash-Riveted Bulwark | Ashen Veil Hood, Ash-Sealed Handwraps | Blood Priest's Dagger Charm, Ash-Touched Charm, Blood Priest's Charm | Level 14 Ash/Blood |

---

## Exact Changes Made

### 1. `src/data/ringLoot.ts`
- **Traveler's Ring** (Common, lvl 2): Changed drops from `Road Thug` to `Blackfang Brigand`, chance from `6.0` to `4.0`.
- **Wolfbite Band** (Common, lvl 4): Changed location from `LOC_001` to `LOC_002`, drops from `Broken Shield Guard` to `Young Wolf`, chance from `6.0` to `4.0`. Notable mapping updated from `LOC_001` to `LOC_002`.
- **Marauder's Iron Band** (Uncommon, lvl 6): Changed location from `LOC_002` to `LOC_003`, drops from `Young Wolf` to `Savage Marauder`, chance from `4.5` to `4.5`. Notable mapping updated from `LOC_002` to `LOC_003`.

### 2. `src/data/amuletLoot.ts`
- **Wolf Fang Charm** (Common, lvl 2): Changed drops from `Road Thug` to `Thorn Rot Hound`, chance from `6.0` to `4.0`. Notable mapping updated to remove `Road Saint Pendant`.
- **Road Saint Pendant** (Common, lvl 4): Changed location from `LOC_001` to `LOC_002`, drops from `Broken Shield Guard` to `Young Wolf`, chance from `6.0` to `4.0`. Notable mapping updated to `LOC_002`.
- **Iron Sigil** (Uncommon, lvl 6): Changed location from `LOC_002` to `LOC_004`, drops from `Young Wolf` to `Iron Guard`, chance from `4.5` to `4.5`. Notable mapping updated from `LOC_002` to `LOC_004`.
- **Ash-Touched Charm** (Uncommon, lvl 8): Changed location from `LOC_004` to `LOC_006`, drops from `Tower Shield Veteran` to `Ash Disciple`, chance from `4.5` to `4.5`. Notable mapping updated to `LOC_006`.
- **Blood Priest's Charm** (Uncommon, lvl 11): Changed location from `LOC_005` to `LOC_006`, drops from `Iron Gate Warden` to `Blood Priest`, chance from `4.5` to `4.5`. Notable mapping updated to `LOC_006`.
- **Mercenary Luck Talisman** (Rare, lvl 14): Changed location from `LOC_006` to `LOC_007`, drops from `Ash Disciple` to `Wild Raider` (the valid LOC_007 enemy), chance from `2.5` to `2.5`. Notable mapping updated to `LOC_007`.

### 3. `src/data/shieldLoot.ts`
- **Roadwatch Buckler** (Common, lvl 2): Changed drops from `Road Thug` to `Blackfang Brigand`, chance from `6.0` to `4.0`.
- **Splinterhide Guard** (Common, lvl 4): Changed location from `LOC_001` to `LOC_002`, drops from `Broken Shield Guard` to `Young Wolf`, chance from `6.0` to `4.0`. Notable mapping updated to `LOC_002`.

### 4. `src/data/minorArmorLoot.ts`
- **Roadside Hood / Torn Road Wraps / Patchwork Greaves / Roadworn Boots** (Common, lvl 2): Changed drops from `Road Thug` to `Blackfang Brigand`, chance from `6.0` to `4.0`.
- **Scout Hood / Raider Grips / Roadworn Trousers / Mudstalker Boots** (Common, lvl 4): Changed location from `LOC_001` to `LOC_002`, drops from `Broken Shield Guard` to `Young Wolf`, chance from `6.0` to `4.0`.
- **Raider Iron Cap / Blackfang Claws / Blackfang Leather Greaves / Blackfang Trail Boots** (Uncommon, lvl 6): Changed location from `LOC_002` to `LOC_003`, drops from `Young Wolf` to `Wild Raider`, chance from `4.5` to `4.5`.

### 5. `src/data/generated/ringRecipeDrops.json`
- **REC_RING_NEW_003** (Marauder's Iron Band): Changed `source_location` to `Raider Camp`, `drops_from` to `Wild Raider / Savage Marauder`.

### 6. `src/data/generated/amuletRecipeDrops.json`
- **REC_AMULET_NEW_003** (Iron Sigil): Changed `source_location` to `Old Watchtower`, `drops_from` to `Iron Guard`.
- **REC_AMULET_NEW_004** (Ash-Touched Charm): Changed `source_location` to `Ashen Marsh`, `drops_from` to `Ash Disciple`.
- **REC_AMULET_NEW_005** (Blood Priest's Charm): Changed `source_location` to `Ashen Marsh`, `drops_from` to `Blood Priest`.
- **REC_AMULET_NEW_006** (Mercenary Luck Talisman): Changed `source_location` to `Mercenary Crossroads`, `drops_from` to `Wild Raider`.

---

## Validation Results
We ran the standard validation suite:
- `npm run typecheck` (Success)
- `npm run lint` (Success, no errors)
- `npm run test` (Success, 91/91 tests passed)
- `npm run build` (Success)

---

## Remaining Risks
- `LOC_007` (Mercenary Crossroads) currently spawns `Wild Raider` variants because proper Mercenary enemies are not present in `enemies.json`. Although the talisman now correctly drops from `Wild Raider` in this zone, players might find it odd that raiders drop mercenary-themed gear until a follow-up enemy identity audit is executed.
