# Vaelmour Enemy Progression Balance Audit Report

## Hero Baseline Stats per Level (Common Gear)
| Level | Max HP | Agility | Strength | Vitality | Attack Power | Defense | Agility Crit | Agility Dodge | Accuracy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Level 3 | 250 | 12 | 12 | 12 | 24 | 5 | 8.6% | 8.4% | 86.8% |
| Level 6 | 310 | 15 | 15 | 15 | 30 | 10 | 9.5% | 9.0% | 87.3% |
| Level 9 | 370 | 18 | 18 | 18 | 36 | 14 | 10.4% | 9.6% | 87.7% |
| Level 12 | 430 | 21 | 21 | 21 | 42 | 19 | 11.3% | 10.2% | 88.1% |
| Level 15 | 490 | 24 | 24 | 24 | 48 | 24 | 12.2% | 10.8% | 88.6% |
| Level 18 | 550 | 27 | 27 | 27 | 54 | 28 | 13.1% | 11.4% | 89.0% |
| Level 21 | 610 | 30 | 30 | 30 | 60 | 33 | 14.0% | 12.0% | 89.5% |
| Level 24 | 670 | 33 | 33 | 33 | 66 | 38 | 14.9% | 12.6% | 90.0% |
| Level 27 | 730 | 36 | 36 | 36 | 72 | 42 | 15.8% | 13.2% | 90.4% |
| Level 30 | 790 | 39 | 39 | 39 | 78 | 47 | 16.7% | 13.8% | 90.8% |

## Location Difficulty & Simulation Results (Mode A vs Mode B)
- **Mode A**: No between-fight regeneration (primary balance benchmark, target: **2.5 - 4.5** kills per run, optimal **3.0 - 4.0**).
- **Mode B**: Real regen comparison (secondary diagnostic only).

| Location | Hero Level | Avg Kills (Mode A) | Avg Kills (Mode B) | Median Kills (A) | 10th% (A) | 90th% (A) | Avg Enemy Dmg | Avg TTK (Rounds) | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Broken Road Outskirts | Lvl 3 | **8.35** | 8.96 | 8 | 4 | 13 | 25.7 | 3.4 | LOC_001 (Skip heavy rebalance) |
| Blackfang Forest | Lvl 3 | **4.43** | 4.65 | 4 | 2 | 8 | 43.6 | 4 | OK |
| Raider Camp | Lvl 6 | **4.5** | 4.81 | 4 | 2 | 8 | 52.4 | 3.9 | OK |
| Old Watchtower | Lvl 9 | **3.79** | 3.99 | 3 | 1 | 7 | 71.2 | 4.2 | OK |
| Iron Bastion Approach | Lvl 9 | **2.7** | 2.87 | 2 | 1 | 5 | 87.7 | 4.6 | OK |
| Iron Bastion Approach | Lvl 12 | **4.07** | 4.26 | 4 | 2 | 7 | 78.5 | 4 | OK |
| Ashen Marsh | Lvl 12 | **2.85** | 2.98 | 3 | 1 | 5 | 104.5 | 4.7 | OK |
| Mercenary Crossroads | Lvl 15 | **4.26** | 4.56 | 4 | 2 | 7 | 94.6 | 4.7 | OK |
| Execution Grounds | Lvl 18 | **3.42** | 3.69 | 3 | 1 | 6 | 119.1 | 4.7 | OK |
| Raven Hollow | Lvl 18 | **3.77** | 3.96 | 3 | 2 | 6 | 111.1 | 4.6 | OK |
| Iron Bastion Inner Yard | Lvl 21 | **3.24** | 3.5 | 3 | 1 | 5 | 144.8 | 5.1 | OK |
| Ash Cult Sanctuary | Lvl 21 | **2.52** | 2.69 | 2 | 1 | 4 | 172.6 | 5.5 | OK |
| Ash Cult Sanctuary | Lvl 24 | **3.31** | 3.47 | 3 | 2 | 6 | 157.2 | 5.1 | OK |
| Warbound Arena Ruins | Lvl 24 | **2.58** | 2.79 | 3 | 2 | 3 | 214.8 | 7.2 | OK |
| Crimson Quarry | Lvl 27 | **2.71** | 2.81 | 2 | 1 | 5 | 196.6 | 5.6 | OK |
| Vaelor's Threshold | Lvl 30 | **2.76** | 3.04 | 2 | 1 | 5 | 212.2 | 5.7 | OK |

## Specific Enemy Details & Identified Outliers
Here is the detailed statistics on normal enemies from simulation runs:

### Broken Road Outskirts (LOC_001) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_vael_thorn_rot_hound_001 | Thorn Rot Hound | 38 | 6 | 0 | 7.2 | 2.9 | 753 |
| enemy_19_young_wolf_091 | Young Wolf | 227 | 23 | 5 | 7.5 | 2.3 | 829 |
| enemy_04_young_wolf_016 | Young Wolf | 140 | 20 | 4 | 95.1 | 7.0 | 503 |
| enemy_25_young_wolf_121 | Young Wolf | 50 | 5 | 1 | 0.2 | 1.2 | 777 |
| enemy_13_young_wolf_061 | Young Wolf | 239 | 27 | 5 | 38.2 | 4.5 | 652 |
| enemy_vael_blackfang_brigand_001 | Blackfang Brigand | 46 | 7 | 1 | 11.4 | 3.3 | 786 |
| enemy_22_young_wolf_106 | Young Wolf | 93 | 9 | 2 | 0.3 | 1.1 | 789 |
| enemy_07_young_wolf_031 | Young Wolf | 155 | 20 | 4 | 57.7 | 5.6 | 577 |
| enemy_28_young_wolf_136 | Young Wolf | 260 | 25 | 5 | 0.6 | 1.2 | 780 |
| enemy_01_young_wolf_001 | Young Wolf | 93 | 14 | 4 | 72.8 | 6.4 | 576 |
| enemy_10_young_wolf_046 | Young Wolf | 190 | 23 | 4 | 45.3 | 4.9 | 619 |
| enemy_16_young_wolf_076 | Young Wolf | 268 | 29 | 5 | 24.2 | 3.6 | 712 |

### Blackfang Forest (LOC_002) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_young_wolf_001 | Young Wolf | 93 | 14 | 4 | 98.3 | 7.2 | 171 |
| enemy_05_fang_stalker_021 | Fang Stalker | 158 | 22 | 4 | 151.6 | 8.6 | 139 |
| enemy_22_young_wolf_106 | Young Wolf | 93 | 9 | 2 | 0.2 | 1.1 | 289 |
| enemy_11_fang_stalker_051 | Fang Stalker | 207 | 24 | 4 | 73.9 | 6.1 | 227 |
| enemy_14_fang_stalker_066 | Fang Stalker | 255 | 28 | 5 | 57.8 | 5.3 | 171 |
| enemy_28_young_wolf_136 | Young Wolf | 260 | 25 | 5 | 1.6 | 1.4 | 268 |
| enemy_07_young_wolf_031 | Young Wolf | 155 | 20 | 4 | 98.4 | 7.1 | 190 |
| enemy_17_fang_stalker_081 | Fang Stalker | 284 | 30 | 6 | 37.2 | 4.3 | 224 |
| enemy_04_young_wolf_016 | Young Wolf | 140 | 20 | 4 | 144.1 | 8.5 | 139 |
| enemy_13_young_wolf_061 | Young Wolf | 239 | 27 | 5 | 64.7 | 5.7 | 201 |
| enemy_19_young_wolf_091 | Young Wolf | 227 | 23 | 5 | 15.0 | 3.0 | 289 |
| enemy_26_fang_stalker_126 | Fang Stalker | 52 | 5 | 1 | 0.2 | 1.2 | 293 |
| enemy_23_fang_stalker_111 | Fang Stalker | 98 | 10 | 2 | 0.3 | 1.2 | 267 |
| enemy_20_fang_stalker_096 | Fang Stalker | 239 | 24 | 5 | 13.4 | 2.8 | 256 |
| enemy_29_fang_stalker_141 | Fang Stalker | 270 | 26 | 5 | 0.9 | 1.2 | 239 |
| enemy_16_young_wolf_076 | Young Wolf | 268 | 29 | 5 | 42.0 | 4.7 | 227 |
| enemy_08_fang_stalker_036 | Fang Stalker | 171 | 22 | 4 | 94.1 | 6.9 | 167 |
| enemy_25_young_wolf_121 | Young Wolf | 50 | 5 | 1 | 0.3 | 1.2 | 286 |
| enemy_10_young_wolf_046 | Young Wolf | 190 | 23 | 4 | 77.2 | 6.3 | 196 |
| enemy_02_fang_stalker_006 | Fang Stalker | 98 | 16 | 4 | 101.0 | 7.2 | 193 |

### Raider Camp (LOC_003) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_wild_raider_002 | Wild Raider | 110 | 18 | 7 | 114.1 | 6.9 | 118 |
| enemy_05_blood_raider_022 | Blood Raider | 186 | 26 | 9 | 195.7 | 9.0 | 90 |
| enemy_27_savage_marauder_132 | Savage Marauder | 56 | 6 | 2 | 0.2 | 1.2 | 196 |
| enemy_03_savage_marauder_012 | Savage Marauder | 142 | 21 | 9 | 152.9 | 8.1 | 100 |
| enemy_23_blood_raider_112 | Blood Raider | 102 | 10 | 4 | 0.4 | 1.2 | 194 |
| enemy_04_wild_raider_017 | Wild Raider | 167 | 24 | 9 | 184.6 | 8.9 | 103 |
| enemy_12_savage_marauder_057 | Savage Marauder | 243 | 28 | 11 | 82.3 | 5.9 | 131 |
| enemy_07_wild_raider_032 | Wild Raider | 177 | 23 | 9 | 124.2 | 7.3 | 132 |
| enemy_16_wild_raider_077 | Wild Raider | 286 | 31 | 11 | 50.2 | 4.5 | 179 |
| enemy_08_blood_raider_037 | Blood Raider | 193 | 25 | 9 | 122.2 | 7.1 | 115 |
| enemy_22_wild_raider_107 | Wild Raider | 98 | 10 | 4 | 0.2 | 1.1 | 186 |
| enemy_28_wild_raider_137 | Wild Raider | 271 | 27 | 10 | 1.6 | 1.3 | 177 |
| enemy_29_blood_raider_142 | Blood Raider | 281 | 27 | 10 | 1.4 | 1.3 | 186 |
| enemy_30_savage_marauder_147 | Savage Marauder | 290 | 28 | 10 | 0.6 | 1.1 | 187 |
| enemy_06_savage_marauder_027 | Savage Marauder | 206 | 28 | 11 | 194.2 | 8.9 | 72 |
| enemy_18_savage_marauder_087 | Savage Marauder | 318 | 34 | 13 | 39.0 | 4.1 | 166 |
| enemy_20_blood_raider_097 | Blood Raider | 252 | 26 | 10 | 15.9 | 2.8 | 197 |
| enemy_17_blood_raider_082 | Blood Raider | 303 | 33 | 13 | 47.0 | 4.4 | 178 |
| enemy_11_blood_raider_052 | Blood Raider | 227 | 27 | 9 | 88.2 | 6.1 | 104 |
| enemy_13_wild_raider_062 | Wild Raider | 259 | 30 | 11 | 77.3 | 5.8 | 124 |
| enemy_02_blood_raider_007 | Blood Raider | 125 | 20 | 7 | 132.6 | 7.4 | 114 |
| enemy_19_wild_raider_092 | Wild Raider | 240 | 25 | 9 | 17.8 | 2.9 | 167 |
| enemy_09_savage_marauder_042 | Savage Marauder | 210 | 26 | 10 | 120.8 | 7.2 | 127 |
| enemy_25_wild_raider_122 | Wild Raider | 52 | 5 | 2 | 0.2 | 1.1 | 193 |
| enemy_15_savage_marauder_072 | Savage Marauder | 293 | 32 | 12 | 65.6 | 5.2 | 139 |
| enemy_21_savage_marauder_102 | Savage Marauder | 264 | 27 | 10 | 15.0 | 2.7 | 176 |
| enemy_10_wild_raider_047 | Wild Raider | 211 | 26 | 9 | 95.6 | 6.3 | 145 |
| enemy_14_blood_raider_067 | Blood Raider | 275 | 31 | 12 | 71.7 | 5.5 | 138 |
| enemy_26_blood_raider_127 | Blood Raider | 54 | 5 | 2 | 0.2 | 1.2 | 196 |
| enemy_24_savage_marauder_117 | Savage Marauder | 107 | 11 | 4 | 0.4 | 1.1 | 175 |

### Old Watchtower (LOC_004) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_iron_guard_003 | Iron Guard | 137 | 21 | 11 | 161.6 | 7.5 | 149 |
| enemy_08_shield_veteran_038 | Shield Veteran | 215 | 28 | 15 | 160.8 | 7.5 | 160 |
| enemy_20_shield_veteran_098 | Shield Veteran | 339 | 36 | 18 | 33.3 | 3.5 | 208 |
| enemy_10_iron_guard_048 | Iron Guard | 333 | 41 | 21 | 242.4 | 8.7 | 88 |
| enemy_23_shield_veteran_113 | Shield Veteran | 107 | 11 | 6 | 0.6 | 1.2 | 218 |
| enemy_16_iron_guard_078 | Iron Guard | 305 | 34 | 18 | 61.3 | 4.7 | 204 |
| enemy_28_iron_guard_138 | Iron Guard | 281 | 28 | 15 | 2.7 | 1.5 | 247 |
| enemy_22_iron_guard_108 | Iron Guard | 103 | 11 | 5 | 0.4 | 1.1 | 231 |
| enemy_11_shield_veteran_053 | Shield Veteran | 247 | 30 | 15 | 112.6 | 6.2 | 171 |
| enemy_07_iron_guard_033 | Iron Guard | 199 | 26 | 13 | 160.5 | 7.6 | 145 |
| enemy_02_shield_veteran_008 | Shield Veteran | 151 | 23 | 12 | 169.6 | 7.6 | 154 |
| enemy_13_iron_guard_063 | Iron Guard | 279 | 32 | 18 | 100.1 | 5.9 | 146 |
| enemy_19_iron_guard_093 | Iron Guard | 254 | 27 | 14 | 22.9 | 3.0 | 215 |
| enemy_29_shield_veteran_143 | Shield Veteran | 291 | 29 | 15 | 1.1 | 1.2 | 226 |
| enemy_14_shield_veteran_068 | Shield Veteran | 296 | 34 | 18 | 88.5 | 5.5 | 198 |
| enemy_vael_crossroad_duelist_001 | Crossroad Duelist | 250 | 28 | 9 | 85.4 | 5.6 | 184 |
| enemy_04_iron_guard_018 | Iron Guard | 195 | 28 | 15 | 238.1 | 8.9 | 106 |
| enemy_26_shield_veteran_128 | Shield Veteran | 56 | 6 | 3 | 0.2 | 1.2 | 225 |
| enemy_25_iron_guard_123 | Iron Guard | 54 | 5 | 3 | 0.3 | 1.2 | 231 |
| enemy_17_shield_veteran_083 | Shield Veteran | 321 | 35 | 19 | 56.5 | 4.4 | 198 |
| enemy_05_shield_veteran_023 | Shield Veteran | 214 | 30 | 15 | 234.4 | 9.0 | 87 |

### Iron Bastion Approach (LOC_005) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_iron_guard_003 | Iron Guard | 137 | 21 | 11 | 194.8 | 8.3 | 100 |
| enemy_27_legion_protector_133 | Legion Protector | 58 | 6 | 3 | 0.3 | 1.2 | 183 |
| enemy_16_iron_guard_078 | Iron Guard | 305 | 34 | 18 | 90.9 | 5.6 | 149 |
| enemy_22_iron_guard_108 | Iron Guard | 103 | 11 | 5 | 0.4 | 1.1 | 175 |
| enemy_30_legion_protector_148 | Legion Protector | 300 | 29 | 15 | 3.2 | 1.5 | 166 |
| enemy_03_legion_protector_013 | Legion Protector | 169 | 25 | 12 | 232.6 | 9.0 | 102 |
| enemy_24_legion_protector_118 | Legion Protector | 111 | 11 | 6 | 0.5 | 1.1 | 203 |
| enemy_21_legion_protector_103 | Legion Protector | 354 | 37 | 20 | 43.3 | 3.9 | 155 |
| enemy_19_iron_guard_093 | Iron Guard | 254 | 27 | 14 | 34.2 | 3.6 | 167 |
| enemy_09_legion_protector_043 | Legion Protector | 232 | 29 | 15 | 207.4 | 8.6 | 121 |
| enemy_18_legion_protector_088 | Legion Protector | 336 | 36 | 19 | 71.9 | 4.9 | 172 |
| enemy_13_iron_guard_063 | Iron Guard | 279 | 32 | 18 | 145.5 | 7.1 | 130 |
| enemy_04_iron_guard_018 | Iron Guard | 195 | 28 | 15 | 268.0 | 9.7 | 88 |
| enemy_15_legion_protector_073 | Legion Protector | 313 | 35 | 19 | 117.6 | 6.4 | 132 |
| enemy_07_iron_guard_033 | Iron Guard | 199 | 26 | 13 | 198.5 | 8.5 | 119 |
| enemy_25_iron_guard_123 | Iron Guard | 54 | 5 | 3 | 0.3 | 1.2 | 189 |
| enemy_12_legion_protector_058 | Legion Protector | 380 | 45 | 23 | 275.8 | 9.5 | 53 |
| enemy_28_iron_guard_138 | Iron Guard | 281 | 28 | 15 | 6.1 | 1.8 | 188 |
| enemy_06_legion_protector_028 | Legion Protector | 234 | 32 | 17 | 290.7 | 10.2 | 66 |
| enemy_10_iron_guard_048 | Iron Guard | 333 | 41 | 21 | 297.7 | 9.9 | 43 |

### Iron Bastion Approach (LOC_005) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_iron_guard_003 | Iron Guard | 137 | 21 | 11 | 147.9 | 6.7 | 150 |
| enemy_06_legion_protector_028 | Legion Protector | 234 | 32 | 17 | 239.3 | 8.4 | 130 |
| enemy_27_legion_protector_133 | Legion Protector | 58 | 6 | 3 | 0.3 | 1.2 | 275 |
| enemy_16_iron_guard_078 | Iron Guard | 305 | 34 | 18 | 70.2 | 4.7 | 221 |
| enemy_22_iron_guard_108 | Iron Guard | 103 | 11 | 5 | 0.4 | 1.1 | 245 |
| enemy_21_legion_protector_103 | Legion Protector | 354 | 37 | 20 | 33.9 | 3.4 | 235 |
| enemy_07_iron_guard_033 | Iron Guard | 199 | 26 | 13 | 159.1 | 7.0 | 163 |
| enemy_03_legion_protector_013 | Legion Protector | 169 | 25 | 12 | 175.7 | 7.2 | 170 |
| enemy_28_iron_guard_138 | Iron Guard | 281 | 28 | 15 | 2.4 | 1.4 | 271 |
| enemy_15_legion_protector_073 | Legion Protector | 313 | 35 | 19 | 95.7 | 5.4 | 217 |
| enemy_13_iron_guard_063 | Iron Guard | 279 | 32 | 18 | 110.9 | 5.7 | 201 |
| enemy_24_legion_protector_118 | Legion Protector | 111 | 11 | 6 | 0.5 | 1.2 | 272 |
| enemy_19_iron_guard_093 | Iron Guard | 254 | 27 | 14 | 25.3 | 3.0 | 231 |
| enemy_09_legion_protector_043 | Legion Protector | 232 | 29 | 15 | 173.0 | 7.3 | 177 |
| enemy_25_iron_guard_123 | Iron Guard | 54 | 5 | 3 | 0.1 | 1.1 | 285 |
| enemy_12_legion_protector_058 | Legion Protector | 380 | 45 | 23 | 250.8 | 8.2 | 133 |
| enemy_10_iron_guard_048 | Iron Guard | 333 | 41 | 21 | 284.7 | 9.0 | 105 |
| enemy_30_legion_protector_148 | Legion Protector | 300 | 29 | 15 | 1.0 | 1.2 | 234 |
| enemy_18_legion_protector_088 | Legion Protector | 336 | 36 | 19 | 57.5 | 4.2 | 221 |
| enemy_04_iron_guard_018 | Iron Guard | 195 | 28 | 15 | 220.0 | 7.9 | 138 |

### Ashen Marsh (LOC_006) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_ash_disciple_004 | Ash Disciple | 164 | 25 | 14 | 236.5 | 8.5 | 116 |
| enemy_23_blood_priest_114 | Blood Priest | 112 | 12 | 8 | 0.5 | 1.1 | 197 |
| enemy_04_ash_disciple_019 | Ash Disciple | 223 | 32 | 19 | 320.2 | 9.7 | 69 |
| enemy_14_blood_priest_069 | Blood Priest | 316 | 36 | 24 | 172.0 | 7.1 | 143 |
| enemy_25_ash_disciple_124 | Ash Disciple | 56 | 6 | 4 | 0.3 | 1.2 | 207 |
| enemy_19_ash_disciple_094 | Ash Disciple | 267 | 29 | 19 | 44.0 | 3.7 | 189 |
| enemy_26_blood_priest_129 | Blood Priest | 59 | 6 | 4 | 0.3 | 1.2 | 184 |
| enemy_20_blood_priest_099 | Blood Priest | 279 | 30 | 20 | 38.6 | 3.5 | 196 |
| enemy_29_blood_priest_144 | Blood Priest | 302 | 30 | 20 | 5.8 | 1.7 | 175 |
| enemy_17_blood_priest_084 | Blood Priest | 340 | 38 | 25 | 114.2 | 5.8 | 146 |
| enemy_28_ash_disciple_139 | Ash Disciple | 292 | 29 | 20 | 8.1 | 2.0 | 173 |
| enemy_02_blood_priest_009 | Blood Priest | 178 | 27 | 16 | 257.7 | 8.7 | 108 |
| enemy_16_ash_disciple_079 | Ash Disciple | 324 | 36 | 24 | 129.4 | 6.2 | 146 |
| enemy_11_blood_priest_054 | Blood Priest | 267 | 32 | 20 | 207.0 | 7.9 | 115 |
| enemy_22_ash_disciple_109 | Ash Disciple | 108 | 11 | 7 | 1.6 | 1.3 | 180 |
| enemy_10_ash_disciple_049 | Ash Disciple | 251 | 31 | 20 | 207.5 | 8.0 | 128 |
| enemy_08_blood_priest_039 | Blood Priest | 236 | 30 | 19 | 245.7 | 8.6 | 114 |
| enemy_05_blood_priest_024 | Blood Priest | 242 | 33 | 20 | 333.6 | 10.0 | 54 |
| enemy_13_ash_disciple_064 | Ash Disciple | 300 | 35 | 23 | 191.5 | 7.4 | 106 |
| enemy_07_ash_disciple_034 | Ash Disciple | 220 | 29 | 19 | 233.0 | 8.5 | 108 |

### Mercenary Crossroads (LOC_007) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_wild_raider_002 | Wild Raider | 110 | 18 | 7 | 103.5 | 5.3 | 340 |
| enemy_25_wild_raider_122 | Wild Raider | 52 | 5 | 2 | 0.3 | 1.1 | 434 |
| enemy_16_wild_raider_077 | Wild Raider | 286 | 31 | 11 | 120.9 | 5.8 | 316 |
| enemy_22_wild_raider_107 | Wild Raider | 98 | 10 | 4 | 1.6 | 1.3 | 409 |
| enemy_19_wild_raider_092 | Wild Raider | 240 | 25 | 9 | 41.0 | 3.6 | 377 |
| enemy_vael_mercenary_swordsman_001 | Mercenary Swordsman | 243 | 27 | 8 | 135.7 | 6.4 | 294 |
| enemy_07_wild_raider_032 | Wild Raider | 177 | 23 | 9 | 144.7 | 6.5 | 253 |
| enemy_10_wild_raider_047 | Wild Raider | 211 | 26 | 9 | 150.7 | 6.5 | 291 |
| enemy_28_wild_raider_137 | Wild Raider | 271 | 27 | 10 | 8.4 | 1.9 | 418 |
| enemy_13_wild_raider_062 | Wild Raider | 259 | 30 | 11 | 156.7 | 6.7 | 282 |
| enemy_vael_crossroad_duelist_001 | Crossroad Duelist | 250 | 28 | 9 | 154.4 | 6.7 | 262 |
| enemy_vael_veteran_sellblade_001 | Veteran Sellblade | 259 | 31 | 12 | 178.2 | 7.2 | 309 |
| enemy_04_wild_raider_017 | Wild Raider | 167 | 24 | 9 | 179.9 | 7.0 | 280 |

### Execution Grounds (LOC_008) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_executioner_005 | Executioner | 190 | 28 | 18 | 296.5 | 8.2 | 91 |
| enemy_23_pit_crusher_115 | Pit Crusher | 112 | 12 | 9 | 3.3 | 1.5 | 143 |
| enemy_22_executioner_110 | Executioner | 112 | 12 | 9 | 5.2 | 1.8 | 127 |
| enemy_17_blood_raider_082 | Blood Raider | 303 | 33 | 13 | 130.7 | 5.7 | 129 |
| enemy_13_executioner_065 | Executioner | 320 | 38 | 28 | 275.7 | 8.1 | 86 |
| enemy_07_executioner_035 | Executioner | 242 | 32 | 23 | 290.5 | 8.4 | 96 |
| enemy_20_pit_crusher_100 | Pit Crusher | 281 | 30 | 24 | 59.8 | 3.9 | 137 |
| enemy_29_blood_raider_142 | Blood Raider | 281 | 27 | 10 | 8.9 | 1.9 | 146 |
| enemy_25_executioner_125 | Executioner | 59 | 6 | 5 | 0.5 | 1.2 | 123 |
| enemy_02_blood_raider_007 | Blood Raider | 125 | 20 | 7 | 115.6 | 5.2 | 101 |
| enemy_20_blood_raider_097 | Blood Raider | 252 | 26 | 10 | 43.8 | 3.6 | 123 |
| enemy_28_executioner_140 | Executioner | 302 | 31 | 25 | 13.3 | 2.1 | 159 |
| enemy_05_blood_raider_022 | Blood Raider | 186 | 26 | 9 | 191.5 | 6.9 | 104 |
| enemy_16_executioner_080 | Executioner | 343 | 39 | 30 | 197.8 | 6.9 | 108 |
| enemy_19_executioner_095 | Executioner | 281 | 31 | 24 | 75.6 | 4.4 | 129 |
| enemy_08_blood_raider_037 | Blood Raider | 193 | 25 | 9 | 152.9 | 6.3 | 106 |
| enemy_08_pit_crusher_040 | Pit Crusher | 248 | 32 | 24 | 277.9 | 8.3 | 83 |
| enemy_26_pit_crusher_130 | Pit Crusher | 58 | 6 | 5 | 0.4 | 1.2 | 170 |
| enemy_11_blood_raider_052 | Blood Raider | 227 | 27 | 9 | 168.8 | 6.6 | 93 |
| enemy_26_blood_raider_127 | Blood Raider | 54 | 5 | 2 | 0.2 | 1.1 | 139 |
| enemy_29_pit_crusher_145 | Pit Crusher | 300 | 30 | 24 | 11.0 | 2.0 | 156 |
| enemy_23_blood_raider_112 | Blood Raider | 102 | 10 | 4 | 1.0 | 1.1 | 167 |
| enemy_17_pit_crusher_085 | Pit Crusher | 344 | 38 | 30 | 175.4 | 6.4 | 130 |
| enemy_04_executioner_020 | Executioner | 251 | 35 | 24 | 393.5 | 9.7 | 59 |
| enemy_11_pit_crusher_055 | Pit Crusher | 276 | 34 | 25 | 239.8 | 7.7 | 93 |
| enemy_14_blood_raider_067 | Blood Raider | 275 | 31 | 12 | 167.7 | 6.5 | 100 |
| enemy_10_executioner_050 | Executioner | 271 | 34 | 26 | 250.7 | 8.0 | 90 |
| enemy_02_pit_crusher_010 | Pit Crusher | 197 | 29 | 19 | 280.5 | 8.2 | 89 |
| enemy_05_pit_crusher_025 | Pit Crusher | 259 | 36 | 25 | 386.0 | 9.8 | 49 |
| enemy_14_pit_crusher_070 | Pit Crusher | 323 | 38 | 29 | 236.8 | 7.6 | 95 |

### Raven Hollow (LOC_009) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_02_fang_stalker_006 | Fang Stalker | 98 | 16 | 4 | 87.0 | 4.6 | 202 |
| enemy_21_ash_fang_zealot_104 | Ash Fang Zealot | 291 | 31 | 21 | 79.0 | 4.6 | 216 |
| enemy_15_ash_fang_zealot_074 | Ash Fang Zealot | 333 | 38 | 24 | 280.6 | 8.3 | 137 |
| enemy_08_fang_stalker_036 | Fang Stalker | 171 | 22 | 4 | 139.7 | 6.1 | 175 |
| enemy_11_fang_stalker_051 | Fang Stalker | 207 | 24 | 4 | 156.1 | 6.5 | 173 |
| enemy_23_fang_stalker_111 | Fang Stalker | 98 | 10 | 2 | 4.1 | 1.6 | 241 |
| enemy_26_fang_stalker_126 | Fang Stalker | 52 | 5 | 1 | 0.3 | 1.1 | 231 |
| enemy_27_ash_fang_zealot_134 | Ash Fang Zealot | 60 | 6 | 4 | 0.3 | 1.1 | 244 |
| enemy_29_fang_stalker_141 | Fang Stalker | 270 | 26 | 5 | 13.5 | 2.2 | 235 |
| enemy_14_fang_stalker_066 | Fang Stalker | 255 | 28 | 5 | 174.7 | 6.8 | 176 |
| enemy_20_fang_stalker_096 | Fang Stalker | 239 | 24 | 5 | 61.7 | 4.1 | 224 |
| enemy_30_ash_fang_zealot_149 | Ash Fang Zealot | 311 | 31 | 20 | 13.5 | 2.2 | 258 |
| enemy_17_fang_stalker_081 | Fang Stalker | 284 | 30 | 6 | 150.5 | 6.2 | 184 |
| enemy_18_ash_fang_zealot_089 | Ash Fang Zealot | 355 | 39 | 25 | 212.0 | 7.1 | 152 |
| enemy_24_ash_fang_zealot_119 | Ash Fang Zealot | 116 | 12 | 8 | 5.4 | 1.8 | 266 |
| enemy_03_ash_fang_zealot_014 | Ash Fang Zealot | 196 | 28 | 18 | 304.0 | 8.6 | 117 |
| enemy_12_ash_fang_zealot_059 | Ash Fang Zealot | 284 | 34 | 22 | 270.6 | 8.3 | 123 |
| enemy_09_ash_fang_zealot_044 | Ash Fang Zealot | 254 | 32 | 20 | 294.9 | 8.6 | 133 |
| enemy_05_fang_stalker_021 | Fang Stalker | 158 | 22 | 4 | 173.7 | 6.5 | 183 |
| enemy_06_ash_fang_zealot_029 | Ash Fang Zealot | 262 | 35 | 22 | 410.3 | 10.0 | 99 |

### Iron Bastion Inner Yard (LOC_010) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_02_shield_veteran_008 | Shield Veteran | 151 | 23 | 12 | 197.7 | 6.6 | 159 |
| enemy_06_legion_protector_028 | Legion Protector | 234 | 32 | 17 | 316.7 | 8.6 | 116 |
| enemy_27_legion_protector_133 | Legion Protector | 58 | 6 | 3 | 0.3 | 1.1 | 222 |
| enemy_26_shield_veteran_128 | Shield Veteran | 56 | 6 | 3 | 0.4 | 1.1 | 209 |
| enemy_08_shield_veteran_038 | Shield Veteran | 215 | 28 | 15 | 231.0 | 7.4 | 140 |
| enemy_05_shield_veteran_023 | Shield Veteran | 214 | 30 | 15 | 294.5 | 8.2 | 119 |
| enemy_24_legion_protector_118 | Legion Protector | 111 | 11 | 6 | 7.2 | 1.9 | 180 |
| enemy_14_shield_veteran_068 | Shield Veteran | 296 | 34 | 18 | 246.5 | 7.7 | 149 |
| enemy_30_legion_protector_148 | Legion Protector | 300 | 29 | 15 | 15.6 | 2.2 | 208 |
| enemy_23_shield_veteran_113 | Shield Veteran | 107 | 11 | 6 | 8.3 | 2.0 | 214 |
| enemy_03_legion_protector_013 | Legion Protector | 169 | 25 | 12 | 205.3 | 6.8 | 137 |
| enemy_20_shield_veteran_098 | Shield Veteran | 339 | 36 | 18 | 166.7 | 6.2 | 161 |
| enemy_18_legion_protector_088 | Legion Protector | 336 | 36 | 19 | 211.8 | 7.1 | 157 |
| enemy_29_shield_veteran_143 | Shield Veteran | 291 | 29 | 15 | 17.6 | 2.2 | 221 |
| enemy_09_legion_protector_043 | Legion Protector | 232 | 29 | 15 | 240.7 | 7.6 | 168 |
| enemy_15_legion_protector_073 | Legion Protector | 313 | 35 | 19 | 252.2 | 7.9 | 136 |
| enemy_12_legion_protector_058 | Legion Protector | 380 | 45 | 23 | 472.4 | 10.5 | 71 |
| enemy_11_shield_veteran_053 | Shield Veteran | 247 | 30 | 15 | 225.9 | 7.5 | 148 |
| enemy_21_legion_protector_103 | Legion Protector | 354 | 37 | 20 | 143.5 | 5.8 | 166 |
| enemy_17_shield_veteran_083 | Shield Veteran | 321 | 35 | 19 | 207.5 | 6.9 | 155 |

### Ash Cult Sanctuary (LOC_011) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_ash_disciple_004 | Ash Disciple | 164 | 25 | 14 | 270.6 | 7.7 | 70 |
| enemy_10_ash_disciple_049 | Ash Disciple | 251 | 31 | 20 | 322.4 | 8.6 | 80 |
| enemy_22_ash_disciple_109 | Ash Disciple | 108 | 11 | 7 | 12.3 | 2.2 | 119 |
| enemy_17_blood_priest_084 | Blood Priest | 340 | 38 | 25 | 290.1 | 8.3 | 83 |
| enemy_04_ash_disciple_019 | Ash Disciple | 223 | 32 | 19 | 389.3 | 9.4 | 65 |
| enemy_23_blood_priest_114 | Blood Priest | 112 | 12 | 8 | 11.8 | 2.2 | 130 |
| enemy_07_ash_disciple_034 | Ash Disciple | 220 | 29 | 19 | 303.0 | 8.4 | 62 |
| enemy_27_ash_fang_zealot_134 | Ash Fang Zealot | 60 | 6 | 4 | 0.5 | 1.1 | 109 |
| enemy_15_ash_fang_zealot_074 | Ash Fang Zealot | 333 | 38 | 24 | 350.7 | 9.0 | 55 |
| enemy_24_ash_fang_zealot_119 | Ash Fang Zealot | 116 | 12 | 8 | 10.1 | 2.1 | 126 |
| enemy_30_ash_fang_zealot_149 | Ash Fang Zealot | 311 | 31 | 20 | 24.3 | 2.6 | 127 |
| enemy_20_blood_priest_099 | Blood Priest | 279 | 30 | 20 | 143.6 | 5.9 | 94 |
| enemy_05_blood_priest_024 | Blood Priest | 242 | 33 | 20 | 428.1 | 9.9 | 37 |
| enemy_29_blood_priest_144 | Blood Priest | 302 | 30 | 20 | 29.9 | 2.9 | 111 |
| enemy_28_ash_disciple_139 | Ash Disciple | 292 | 29 | 20 | 34.4 | 3.0 | 113 |
| enemy_06_ash_fang_zealot_029 | Ash Fang Zealot | 262 | 35 | 22 | 460.1 | 10.2 | 40 |
| enemy_13_ash_disciple_064 | Ash Disciple | 300 | 35 | 23 | 336.6 | 8.9 | 56 |
| enemy_09_ash_fang_zealot_044 | Ash Fang Zealot | 254 | 32 | 20 | 351.9 | 9.2 | 74 |
| enemy_25_ash_disciple_124 | Ash Disciple | 56 | 6 | 4 | 0.3 | 1.1 | 124 |
| enemy_02_blood_priest_009 | Blood Priest | 178 | 27 | 16 | 282.0 | 7.9 | 73 |
| enemy_08_blood_priest_039 | Blood Priest | 236 | 30 | 19 | 315.4 | 8.7 | 61 |
| enemy_21_ash_fang_zealot_104 | Ash Fang Zealot | 291 | 31 | 21 | 130.0 | 5.7 | 101 |
| enemy_14_blood_priest_069 | Blood Priest | 316 | 36 | 24 | 335.0 | 8.9 | 69 |
| enemy_11_blood_priest_054 | Blood Priest | 267 | 32 | 20 | 332.6 | 8.7 | 64 |
| enemy_18_ash_fang_zealot_089 | Ash Fang Zealot | 355 | 39 | 25 | 278.4 | 8.3 | 74 |
| enemy_26_blood_priest_129 | Blood Priest | 59 | 6 | 4 | 0.2 | 1.1 | 109 |
| enemy_03_ash_fang_zealot_014 | Ash Fang Zealot | 196 | 28 | 18 | 336.2 | 8.6 | 66 |
| enemy_19_ash_disciple_094 | Ash Disciple | 267 | 29 | 19 | 144.3 | 5.9 | 96 |
| enemy_12_ash_fang_zealot_059 | Ash Fang Zealot | 284 | 34 | 22 | 329.9 | 8.9 | 61 |
| enemy_16_ash_disciple_079 | Ash Disciple | 324 | 36 | 24 | 293.3 | 8.3 | 76 |

### Ash Cult Sanctuary (LOC_011) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_01_ash_disciple_004 | Ash Disciple | 164 | 25 | 14 | 231.3 | 6.9 | 101 |
| enemy_09_ash_fang_zealot_044 | Ash Fang Zealot | 254 | 32 | 20 | 283.6 | 7.9 | 102 |
| enemy_26_blood_priest_129 | Blood Priest | 59 | 6 | 4 | 0.5 | 1.1 | 157 |
| enemy_07_ash_disciple_034 | Ash Disciple | 220 | 29 | 19 | 265.4 | 7.4 | 89 |
| enemy_04_ash_disciple_019 | Ash Disciple | 223 | 32 | 19 | 344.9 | 8.3 | 74 |
| enemy_24_ash_fang_zealot_119 | Ash Fang Zealot | 116 | 12 | 8 | 9.0 | 2.0 | 140 |
| enemy_25_ash_disciple_124 | Ash Disciple | 56 | 6 | 4 | 0.6 | 1.1 | 166 |
| enemy_14_blood_priest_069 | Blood Priest | 316 | 36 | 24 | 294.0 | 8.0 | 82 |
| enemy_19_ash_disciple_094 | Ash Disciple | 267 | 29 | 19 | 126.2 | 5.4 | 109 |
| enemy_23_blood_priest_114 | Blood Priest | 112 | 12 | 8 | 10.8 | 2.1 | 169 |
| enemy_12_ash_fang_zealot_059 | Ash Fang Zealot | 284 | 34 | 22 | 291.3 | 8.2 | 99 |
| enemy_17_blood_priest_084 | Blood Priest | 340 | 38 | 25 | 258.6 | 7.5 | 109 |
| enemy_03_ash_fang_zealot_014 | Ash Fang Zealot | 196 | 28 | 18 | 279.9 | 7.5 | 92 |
| enemy_05_blood_priest_024 | Blood Priest | 242 | 33 | 20 | 390.7 | 9.0 | 82 |
| enemy_20_blood_priest_099 | Blood Priest | 279 | 30 | 20 | 118.2 | 5.2 | 133 |
| enemy_30_ash_fang_zealot_149 | Ash Fang Zealot | 311 | 31 | 20 | 21.4 | 2.5 | 140 |
| enemy_11_blood_priest_054 | Blood Priest | 267 | 32 | 20 | 277.5 | 7.9 | 78 |
| enemy_22_ash_disciple_109 | Ash Disciple | 108 | 11 | 7 | 11.0 | 2.0 | 125 |
| enemy_15_ash_fang_zealot_074 | Ash Fang Zealot | 333 | 38 | 24 | 297.1 | 7.9 | 69 |
| enemy_02_blood_priest_009 | Blood Priest | 178 | 27 | 16 | 242.6 | 7.0 | 95 |
| enemy_27_ash_fang_zealot_134 | Ash Fang Zealot | 60 | 6 | 4 | 0.6 | 1.2 | 143 |
| enemy_08_blood_priest_039 | Blood Priest | 236 | 30 | 19 | 285.5 | 7.8 | 97 |
| enemy_28_ash_disciple_139 | Ash Disciple | 292 | 29 | 20 | 29.6 | 2.7 | 132 |
| enemy_18_ash_fang_zealot_089 | Ash Fang Zealot | 355 | 39 | 25 | 246.5 | 7.4 | 104 |
| enemy_06_ash_fang_zealot_029 | Ash Fang Zealot | 262 | 35 | 22 | 406.0 | 9.2 | 81 |
| enemy_29_blood_priest_144 | Blood Priest | 302 | 30 | 20 | 26.5 | 2.6 | 159 |
| enemy_16_ash_disciple_079 | Ash Disciple | 324 | 36 | 24 | 263.5 | 7.6 | 90 |
| enemy_13_ash_disciple_064 | Ash Disciple | 300 | 35 | 23 | 287.4 | 8.0 | 80 |
| enemy_21_ash_fang_zealot_104 | Ash Fang Zealot | 291 | 31 | 21 | 116.1 | 5.0 | 132 |
| enemy_10_ash_disciple_049 | Ash Disciple | 251 | 31 | 20 | 258.6 | 7.6 | 83 |

### Warbound Arena Ruins (LOC_012) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_vael_mercenary_swordsman_001 | Mercenary Swordsman | 243 | 27 | 8 | 214.8 | 7.2 | 2583 |

### Crimson Quarry (LOC_013) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_02_pit_crusher_010 | Pit Crusher | 197 | 29 | 19 | 331.1 | 7.9 | 120 |
| enemy_11_pit_crusher_055 | Pit Crusher | 276 | 34 | 25 | 330.4 | 8.3 | 131 |
| enemy_06_war_brute_030 | War Brute | 279 | 37 | 27 | 505.6 | 9.8 | 74 |
| enemy_27_war_brute_135 | War Brute | 60 | 6 | 5 | 0.5 | 1.1 | 205 |
| enemy_24_war_brute_120 | War Brute | 116 | 12 | 10 | 14.8 | 2.2 | 191 |
| enemy_14_pit_crusher_070 | Pit Crusher | 323 | 38 | 29 | 360.7 | 8.8 | 110 |
| enemy_26_pit_crusher_130 | Pit Crusher | 58 | 6 | 5 | 0.6 | 1.1 | 195 |
| enemy_08_pit_crusher_040 | Pit Crusher | 248 | 32 | 24 | 339.6 | 8.2 | 109 |
| enemy_30_war_brute_150 | War Brute | 308 | 31 | 25 | 44.5 | 3.2 | 184 |
| enemy_23_pit_crusher_115 | Pit Crusher | 112 | 12 | 9 | 13.3 | 2.2 | 176 |
| enemy_18_war_brute_090 | War Brute | 359 | 40 | 31 | 302.6 | 8.0 | 128 |
| enemy_21_war_brute_105 | War Brute | 292 | 31 | 24 | 160.8 | 5.8 | 139 |
| enemy_29_pit_crusher_145 | Pit Crusher | 300 | 30 | 24 | 51.4 | 3.4 | 190 |
| enemy_09_war_brute_045 | War Brute | 264 | 33 | 25 | 355.7 | 8.4 | 107 |
| enemy_12_war_brute_060 | War Brute | 292 | 35 | 26 | 348.3 | 8.5 | 98 |
| enemy_15_war_brute_075 | War Brute | 340 | 39 | 30 | 364.8 | 8.8 | 105 |
| enemy_20_pit_crusher_100 | Pit Crusher | 281 | 30 | 24 | 163.6 | 5.9 | 140 |
| enemy_03_war_brute_015 | War Brute | 214 | 31 | 21 | 379.0 | 8.3 | 101 |
| enemy_17_pit_crusher_085 | Pit Crusher | 344 | 38 | 30 | 311.2 | 8.1 | 119 |
| enemy_05_pit_crusher_025 | Pit Crusher | 259 | 36 | 25 | 467.6 | 9.4 | 93 |

### Vaelor's Threshold (LOC_014) Normal Enemies Details:
| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| enemy_03_ash_fang_zealot_014 | Ash Fang Zealot | 196 | 28 | 18 | 313.1 | 7.5 | 110 |
| enemy_09_war_brute_045 | War Brute | 264 | 33 | 25 | 370.8 | 8.3 | 111 |
| enemy_27_war_brute_135 | War Brute | 60 | 6 | 5 | 0.4 | 1.1 | 186 |
| enemy_24_ash_fang_zealot_119 | Ash Fang Zealot | 116 | 12 | 8 | 14.8 | 2.3 | 181 |
| enemy_21_war_brute_105 | War Brute | 292 | 31 | 24 | 177.4 | 6.0 | 129 |
| enemy_21_ash_fang_zealot_104 | Ash Fang Zealot | 291 | 31 | 21 | 170.1 | 5.8 | 152 |
| enemy_12_war_brute_060 | War Brute | 292 | 35 | 26 | 355.2 | 8.3 | 132 |
| enemy_06_war_brute_030 | War Brute | 279 | 37 | 27 | 503.7 | 9.6 | 73 |
| enemy_24_war_brute_120 | War Brute | 116 | 12 | 10 | 15.4 | 2.2 | 188 |
| enemy_15_ash_fang_zealot_074 | Ash Fang Zealot | 333 | 38 | 24 | 373.3 | 8.6 | 120 |
| enemy_18_war_brute_090 | War Brute | 359 | 40 | 31 | 337.6 | 8.1 | 129 |
| enemy_03_war_brute_015 | War Brute | 214 | 31 | 21 | 375.6 | 8.0 | 127 |
| enemy_06_ash_fang_zealot_029 | Ash Fang Zealot | 262 | 35 | 22 | 463.8 | 9.0 | 93 |
| enemy_30_ash_fang_zealot_149 | Ash Fang Zealot | 311 | 31 | 20 | 59.7 | 3.6 | 190 |
| enemy_15_war_brute_075 | War Brute | 340 | 39 | 30 | 390.4 | 8.8 | 121 |
| enemy_27_ash_fang_zealot_134 | Ash Fang Zealot | 60 | 6 | 4 | 0.4 | 1.1 | 176 |
| enemy_09_ash_fang_zealot_044 | Ash Fang Zealot | 254 | 32 | 20 | 340.4 | 8.0 | 122 |
| enemy_30_war_brute_150 | War Brute | 308 | 31 | 25 | 62.6 | 3.6 | 163 |
| enemy_12_ash_fang_zealot_059 | Ash Fang Zealot | 284 | 34 | 22 | 323.1 | 8.0 | 122 |
| enemy_18_ash_fang_zealot_089 | Ash Fang Zealot | 355 | 39 | 25 | 322.5 | 7.9 | 131 |

## Proposed Changes
Based on the initial audit findings, we will adjust the enemy base parameters in Phase B.
