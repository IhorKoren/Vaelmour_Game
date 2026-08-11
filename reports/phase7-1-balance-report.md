# Phase 7.1 Balance Pass — Before / After

Generated from the production combat engine and production party-size enemy factory. **10 000 runs/scenario**, 126 combat scenarios. Phase 7 baseline remains in `reports/balance-report.md`. RANDOM Auto uses random attack/defense, no potion, no pattern reading, and no hidden bonus.

## Changed centralized values

| Config | Before | After |
|---|---:|---:|
| 5-player HP / Attack | 100% / 100% | 100% / 100% |
| 4-player HP / Attack | 100% / 100% | 85% / 91% |
| 3-player HP / Attack | 100% / 100% | 68% / 84% |
| BASIC_SMART potion threshold | 42% | tier I 37%, tier II/III 30% |
| Coordinated potion users/round | unlimited | 1 |
| Gear Attack budget T1/T2/T3 | 10 / 22 / 38 | 6 / 14 / 22 |
| Gear HP budget T1/T2/T3 | 65 / 145 / 250 | 40 / 95 / 150 |
| Recipe normal / elite / boss | 0.5% / 2% / 8% | 0.25% / 1% / 4% |

Enemy content attack tuning was isolated after the policy/gear passes: Floor scales 4.00/1.95/1.50 → 3.60/1.68/1.08; Floor 2 boss 277→265, Floor 3 boss 297→280. Boss mechanics, group intervals, weights, XP, coins, and loot tables are unchanged.

## Iteration record

1. Party scaling alone moved 3-player to roughly 64/42/17% and 4-player to 79/54/51%, while 5-player stayed unchanged.
2. A global 10% damage reduction was rejected because it pushed 5-player clears to 94–96% without solving potion exhaustion.
3. Tier II heal 35→40% was rejected because it pushed Floor 3 clear above 96% while saving only about one potion/run. Final heals remain 25/35/45%.
4. Potion instrumentation found 0% low-value/overheal uses; coordinated BASIC_SMART policy was used instead of nerfing all enemies.
5. Gear and consumable tiers were separated in simulation, then equipment budgets were tuned centrally.
6. Recipe rates were halved only after raw supply confirmed 28–40 recipes/100 baseline runs.

## Clear rates — recommended gear

| Party | Before F1 | After F1 | Before F2 | After F2 | Before F3 | After F3 |
|---|---:|---:|---:|---:|---:|---:|
| 3 players | 1.0% | 55.5% | 0.0% | 35.0% | 0.0% | 30.3% |
| 4 players | 22.4% | 71.8% | 6.0% | 54.6% | 1.0% | 56.9% |
| 5 balanced (size comparison) | 85.0% | 80.8% | 74.0% | 75.8% | 77.8% | 68.9% |
| 5 combat | 90.4% | 93.1% | 90.9% | 93.2% | 91.6% | 83.8% |
| Duplicate profession | 86.9% | 82.2% | 76.7% | 74.9% | 81.0% | 73.3% |

## Clear rates — strong/current-tier gear

| Party | Before F1 | After F1 | Before F2 | After F2 | Before F3 | After F3 |
|---|---:|---:|---:|---:|---:|---:|
| 3 players | 12.7% | 71.7% | 14.7% | 62.8% | 1.1% | 65.2% |
| 4 players | 71.6% | 85.4% | 92.0% | 84.9% | 95.0% | 83.7% |
| 5 balanced (size comparison) | 99.0% | 92.0% | 100.0% | 94.8% | 100.0% | 88.9% |
| 5 combat | 99.6% | 97.7% | 100.0% | 98.9% | 100.0% | 96.3% |
| Duplicate profession | 99.2% | 92.0% | 100.0% | 94.3% | 100.0% | 91.6% |

## Potion report — 5-player balanced, recommended

| Floor | Before potions/run | After potions/run | Potions/successful clear | Dead players with potion remaining/run | Exhaustion failures | Low-value uses |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 7.37 | 5.05 | 4.74 | 2.09 | 0.0% | 0.0% |
| 2 | 11.51 | 10.20 | 9.77 | 2.01 | 0.0% | 0.0% |
| 3 | 18.60 | 15.73 | 16.09 | 1.14 | 0.5% | 0.0% |

## Party-size efficiency

| Party | Floor | Clear | Rounds/run | Manual min/run | Retained resources/hour | Recipes/hour | Coins/hour |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 players | 1 | 55.5% | 24.05 | 4.01 | 30.69 | 0.51 | 6282.24 |
| 3 players | 2 | 35.0% | 50.09 | 8.35 | 16.17 | 0.21 | 6870.66 |
| 3 players | 3 | 30.3% | 76.93 | 12.82 | 13.22 | 0.18 | 9376.07 |
| 4 players | 1 | 71.8% | 23.53 | 3.92 | 63.34 | 1.13 | 8454.26 |
| 4 players | 2 | 54.6% | 50.05 | 8.34 | 34.15 | 0.48 | 8829.81 |
| 4 players | 3 | 56.9% | 76.19 | 12.70 | 29.86 | 0.49 | 12538.02 |
| 5 balanced (size comparison) | 1 | 80.8% | 23.12 | 3.85 | 100.94 | 1.94 | 10642.88 |
| 5 balanced (size comparison) | 2 | 75.8% | 49.26 | 8.21 | 58.25 | 0.98 | 11236.64 |
| 5 balanced (size comparison) | 3 | 68.9% | 75.34 | 12.56 | 46.90 | 0.85 | 15474.88 |

## Manual vs RANDOM Auto

| Floor | Gear | BASIC_SMART clear | Auto clear | Difference | Manual min/run | Auto min/run |
|---:|---|---:|---:|---:|---:|---:|
| 1 | RECOMMENDED | 81.1% | 42.5% | 38.6 pp | 3.86 | 11.91 |
| 1 | STRONG | 92.2% | 64.7% | 27.5 pp | 3.62 | 11.37 |
| 2 | RECOMMENDED | 74.2% | 0.1% | 74.0 pp | 8.21 | 24.30 |
| 2 | STRONG | 95.3% | 1.7% | 93.6 pp | 7.29 | 23.54 |
| 3 | RECOMMENDED | 68.3% | 0.0% | 68.3 pp | 12.56 | 32.73 |
| 3 | STRONG | 89.6% | 0.0% | 89.6 pp | 11.77 | 32.72 |

## Economy after failure retention

Failure runs retain 50%; time from failed runs is included.

| Composition | Floor | Coins/run | Coins/hour | Retained resources/run | Resources/hour | Recipes/100 runs | Recipes/hour | Retained loot value/run |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 combat | 1 | 1006.81 | 18420.74 | 1.37 | 25.09 | 0.00 | 0.00 | 1.37 |
| 5 combat | 2 | 2221.83 | 19560.19 | 1.84 | 16.23 | 0.00 | 0.00 | 1.84 |
| 5 combat | 3 | 4479.25 | 24229.90 | 2.23 | 12.06 | 0.00 | 0.00 | 2.23 |
| 5 balanced | 1 | 684.01 | 10642.86 | 6.50 | 101.20 | 13.41 | 2.00 | 6.63 |
| 5 balanced | 2 | 1531.72 | 11194.34 | 7.94 | 58.02 | 14.95 | 1.00 | 8.08 |
| 5 balanced | 3 | 3232.98 | 15442.93 | 9.84 | 46.99 | 19.94 | 0.84 | 10.01 |
| 3 combat + 2 professions | 1 | 766.26 | 12846.36 | 4.80 | 80.44 | 8.85 | 1.42 | 4.88 |
| 3 combat + 2 professions | 2 | 1719.31 | 13678.04 | 5.93 | 47.14 | 10.48 | 0.77 | 6.02 |
| 3 combat + 2 professions | 3 | 3469.51 | 17648.23 | 6.73 | 34.24 | 12.29 | 0.54 | 6.84 |
| Duplicate profession | 1 | 688.29 | 10604.19 | 4.67 | 71.97 | 9.07 | 1.34 | 4.76 |
| Duplicate profession | 2 | 1535.47 | 11102.48 | 5.63 | 40.73 | 10.56 | 0.70 | 5.73 |
| Duplicate profession | 3 | 3288.20 | 15588.91 | 7.12 | 33.77 | 13.83 | 0.60 | 7.25 |
| 3 players | 1 | 419.68 | 6282.24 | 2.05 | 30.69 | 3.93 | 0.51 | 2.08 |
| 3 players | 2 | 956.02 | 6870.66 | 2.25 | 16.17 | 3.82 | 0.21 | 2.28 |
| 3 players | 3 | 2003.55 | 9376.07 | 2.83 | 13.22 | 5.30 | 0.18 | 2.86 |
| 4 players | 1 | 552.66 | 8454.26 | 4.14 | 63.34 | 7.96 | 1.13 | 4.21 |
| 4 players | 2 | 1227.60 | 8829.81 | 4.75 | 34.15 | 8.14 | 0.48 | 4.81 |
| 4 players | 3 | 2653.70 | 12538.02 | 6.32 | 29.86 | 12.36 | 0.49 | 6.42 |
| 5 balanced (size comparison) | 1 | 683.37 | 10642.88 | 6.48 | 100.94 | 13.03 | 1.94 | 6.61 |
| 5 balanced (size comparison) | 2 | 1537.50 | 11236.64 | 7.97 | 58.25 | 14.68 | 0.98 | 8.10 |
| 5 balanced (size comparison) | 3 | 3238.48 | 15474.88 | 9.82 | 46.90 | 20.14 | 0.85 | 9.99 |

## Recipe acquisition — 1,000 completed runs, population 10

| Floor | Profession | Recipes/100 | Avg runs to any | Median | p90 | Expected after 10 | Expected after 50 | New | Duplicate | Duplicate share |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | blacksmith | 6.50 | 15.38 | 11.00 | 35.00 | 0.65 | 3.25 | 54 | 11 | 16.9% |
| 1 | alchemist | 6.00 | 17.24 | 12.00 | 39.00 | 0.60 | 3.00 | 47 | 13 | 21.7% |
| 1 | jeweler | 6.60 | 15.38 | 11.00 | 35.00 | 0.66 | 3.30 | 51 | 15 | 22.7% |
| 2 | blacksmith | 8.30 | 12.50 | 9.00 | 28.00 | 0.83 | 4.15 | 69 | 14 | 16.9% |
| 2 | alchemist | 6.40 | 15.87 | 11.00 | 36.00 | 0.64 | 3.20 | 39 | 25 | 39.1% |
| 2 | jeweler | 6.00 | 17.54 | 12.00 | 40.00 | 0.60 | 3.00 | 47 | 13 | 21.7% |
| 3 | blacksmith | 9.10 | 11.76 | 8.00 | 26.00 | 0.91 | 4.55 | 76 | 15 | 16.5% |
| 3 | alchemist | 9.60 | 10.99 | 8.00 | 25.00 | 0.96 | 4.80 | 57 | 39 | 40.6% |
| 3 | jeweler | 8.90 | 11.63 | 8.00 | 26.00 | 0.89 | 4.45 | 58 | 31 | 34.8% |

## Recipe population/horizon supply

| Completed runs | Population | Floor | New recipes | Duplicates | Total recipes/100 |
|---:|---:|---:|---:|---:|---:|
| 100 | 1 | 1 | 12 | 3 | 15.00 |
| 100 | 1 | 2 | 16 | 2 | 18.00 |
| 100 | 1 | 3 | 22 | 11 | 33.00 |
| 100 | 10 | 1 | 16 | 0 | 16.00 |
| 100 | 10 | 2 | 21 | 1 | 22.00 |
| 100 | 10 | 3 | 28 | 1 | 29.00 |
| 100 | 100 | 1 | 13 | 0 | 13.00 |
| 100 | 100 | 2 | 13 | 0 | 13.00 |
| 100 | 100 | 3 | 28 | 0 | 28.00 |
| 1000 | 1 | 1 | 36 | 152 | 18.80 |
| 1000 | 1 | 2 | 36 | 189 | 22.50 |
| 1000 | 1 | 3 | 37 | 215 | 25.20 |
| 1000 | 10 | 1 | 143 | 38 | 18.10 |
| 1000 | 10 | 2 | 175 | 58 | 23.30 |
| 1000 | 10 | 3 | 187 | 85 | 27.20 |
| 1000 | 100 | 1 | 151 | 3 | 15.40 |
| 1000 | 100 | 2 | 204 | 3 | 20.70 |
| 1000 | 100 | 3 | 241 | 6 | 24.70 |

## Known remaining issues

- Floor 3 5-player balanced potion use remains above the 10–14 soft target in some seeds; it is reported rather than hidden.
- Full current-tier 5-combat gear can still exceed the 95–97% soft ceiling on easier Floors 1–2. Floor 3 is the primary strong-gear guardrail.
- Some 3/4-player floor results may sit just outside soft target bands; reliability and hourly output remain below a full party.
- Recommended RANDOM Auto on Floor 3 can remain 0%; this is intentional and does not trigger a global difficulty nerf.
- Recipe duplicate share grows sharply for small mature populations, confirming that market supply should be watched after launch. No pity or NPC price was added.
