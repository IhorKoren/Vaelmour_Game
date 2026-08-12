# Phase 8.2 First Rift Balance — Party Sizes 1–5

Generated from the production combat engine and production party-size enemy factory. **10 000 runs/scenario**, 198 combat scenarios. Phase 7 baseline remains in `reports/balance-report.md`. RANDOM Auto uses random attack/defense, the shared smart-potion policy, no pattern reading, and no hidden bonus.

## Changed centralized values

| Config | Before | After |
|---|---:|---:|
| 5-player HP / Attack | 100% / 100% | 100% / 100% |
| 2-player base HP / Attack | unsupported | 52% / 62% |
| 1-player base HP / Attack | unsupported | 32% / 40% |
| 1P Floor 1 effective HP / Attack | unsupported | 33.28% / 41.60% |
| 1P Floor 2 effective HP / Attack | unsupported | 31.04% / 36.80% |
| 1P Floor 3 effective HP / Attack | unsupported | 29.76% / 35.20% |
| 2P Floor 1 effective HP / Attack | unsupported | 52.00% / 62.00% |
| 2P Floor 2 effective HP / Attack | unsupported | 50.96% / 60.14% |
| 2P Floor 3 effective HP / Attack | unsupported | 50.44% / 58.28% |
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
| 3 players | 1.0% | 55.5% | 0.0% | 27.5% | 0.0% | 30.3% |
| 4 players | 22.4% | 71.8% | 6.0% | 46.0% | 1.0% | 56.9% |
| 5 balanced (size comparison) | 85.0% | 80.8% | 74.0% | 68.1% | 77.8% | 68.9% |
| 5 combat | 90.4% | 93.1% | 90.9% | 91.2% | 91.6% | 83.8% |
| Duplicate profession | 86.9% | 82.2% | 76.7% | 68.3% | 81.0% | 73.3% |

## Clear rates — strong/current-tier gear

| Party | Before F1 | After F1 | Before F2 | After F2 | Before F3 | After F3 |
|---|---:|---:|---:|---:|---:|---:|
| 3 players | 12.7% | 71.7% | 14.7% | 56.8% | 1.1% | 65.2% |
| 4 players | 71.6% | 85.4% | 92.0% | 76.7% | 95.0% | 83.7% |
| 5 balanced (size comparison) | 99.0% | 92.0% | 100.0% | 91.1% | 100.0% | 88.9% |
| 5 combat | 99.6% | 97.7% | 100.0% | 98.0% | 100.0% | 96.3% |
| Duplicate profession | 99.2% | 92.0% | 100.0% | 91.4% | 100.0% | 91.6% |

## Potion report — 5-player balanced, recommended

| Floor | Before potions/run | After potions/run | Potions/successful clear | Dead players with potion remaining/run | Exhaustion failures | Low-value uses |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 7.37 | 5.05 | 4.74 | 2.09 | 0.0% | 0.0% |
| 2 | 11.51 | 9.20 | 8.78 | 2.42 | 0.0% | 0.0% |
| 3 | 18.60 | 15.73 | 16.09 | 1.14 | 0.5% | 0.0% |

## Party-size efficiency

| Party | Floor | Gear | Mode | Clear | Deaths | Rounds/run | Minutes/run | Potions/run | Potion exhaustion | Retained resources/hour | Recipes/hour | Coins/hour |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 player (combat) | 1 | RECOMMENDED | Manual/Smart | 37.4% | 62.6% | 31.34 | 5.22 | 3.82 | 55.7% | 2.12 | 0.00 | 1838.81 |
| 1 player (combat) | 1 | RECOMMENDED | Auto | 13.1% | 86.9% | 31.75 | 15.87 | 3.77 | 73.0% | 0.55 | 0.00 | 494.46 |
| 1 player (combat) | 1 | STRONG | Manual/Smart | 52.9% | 47.0% | 30.79 | 5.13 | 3.73 | 40.1% | 2.60 | 0.00 | 2072.46 |
| 1 player (combat) | 1 | STRONG | Auto | 22.7% | 77.3% | 31.44 | 15.72 | 3.69 | 61.4% | 0.63 | 0.00 | 547.46 |
| 1 player (combat) | 2 | RECOMMENDED | Manual/Smart | 19.3% | 80.7% | 58.29 | 9.71 | 3.99 | 80.7% | 1.32 | 0.00 | 2284.57 |
| 1 player (combat) | 2 | RECOMMENDED | Auto | 1.6% | 98.4% | 57.90 | 28.95 | 4.00 | 98.4% | 0.35 | 0.00 | 663.95 |
| 1 player (combat) | 2 | STRONG | Manual/Smart | 57.2% | 42.8% | 56.18 | 9.36 | 3.95 | 42.8% | 1.92 | 0.00 | 2824.39 |
| 1 player (combat) | 2 | STRONG | Auto | 13.8% | 86.2% | 57.75 | 28.88 | 3.99 | 86.2% | 0.42 | 0.00 | 743.61 |
| 1 player (combat) | 3 | RECOMMENDED | Manual/Smart | 5.2% | 94.8% | 88.60 | 14.77 | 4.00 | 94.8% | 0.96 | 0.00 | 2908.54 |
| 1 player (combat) | 3 | RECOMMENDED | Auto | 0.2% | 99.8% | 87.83 | 43.92 | 4.00 | 99.8% | 0.29 | 0.00 | 899.24 |
| 1 player (combat) | 3 | STRONG | Manual/Smart | 24.2% | 75.8% | 87.69 | 14.62 | 4.00 | 75.8% | 1.20 | 0.00 | 3186.12 |
| 1 player (combat) | 3 | STRONG | Auto | 2.2% | 97.8% | 88.62 | 44.31 | 4.00 | 97.8% | 0.31 | 0.00 | 943.80 |
| 2 players (mixed) | 1 | RECOMMENDED | Manual/Smart | 52.6% | 57.3% | 29.38 | 4.90 | 5.20 | 3.2% | 22.47 | 0.36 | 3232.37 |
| 2 players (mixed) | 1 | RECOMMENDED | Auto | 26.7% | 79.4% | 30.91 | 15.46 | 5.23 | 6.4% | 5.49 | 0.08 | 872.68 |
| 2 players (mixed) | 1 | STRONG | Manual/Smart | 69.9% | 41.4% | 28.12 | 4.69 | 4.83 | 1.1% | 27.24 | 0.51 | 3743.01 |
| 2 players (mixed) | 1 | STRONG | Auto | 39.6% | 68.8% | 29.92 | 14.96 | 4.81 | 2.8% | 6.50 | 0.10 | 977.94 |
| 2 players (mixed) | 2 | RECOMMENDED | Manual/Smart | 35.2% | 77.1% | 58.93 | 9.82 | 7.38 | 43.3% | 12.59 | 0.18 | 3680.38 |
| 2 players (mixed) | 2 | RECOMMENDED | Auto | 4.2% | 97.5% | 60.81 | 30.41 | 7.34 | 59.1% | 2.85 | 0.04 | 1040.37 |
| 2 players (mixed) | 2 | STRONG | Manual/Smart | 71.1% | 49.0% | 55.55 | 9.26 | 6.88 | 19.0% | 18.05 | 0.30 | 4444.69 |
| 2 players (mixed) | 2 | STRONG | Auto | 22.5% | 85.4% | 59.78 | 29.89 | 7.25 | 45.6% | 3.62 | 0.05 | 1155.80 |
| 2 players (mixed) | 3 | RECOMMENDED | Manual/Smart | 23.6% | 79.6% | 88.86 | 14.81 | 7.99 | 76.4% | 9.68 | 0.14 | 4948.92 |
| 2 players (mixed) | 3 | RECOMMENDED | Auto | 1.8% | 98.6% | 92.08 | 46.04 | 8.00 | 98.1% | 2.40 | 0.03 | 1461.80 |
| 2 players (mixed) | 3 | STRONG | Manual/Smart | 60.5% | 44.5% | 85.89 | 14.31 | 7.92 | 39.6% | 13.90 | 0.25 | 5848.71 |
| 2 players (mixed) | 3 | STRONG | Auto | 14.2% | 88.2% | 90.88 | 45.44 | 7.99 | 85.8% | 2.84 | 0.04 | 1555.50 |
| 3 players | 1 | RECOMMENDED | Manual/Smart | 55.5% | 60.4% | 24.05 | 4.01 | 4.70 | 0.0% | 30.69 | 0.51 | 6282.24 |
| 3 players | 1 | RECOMMENDED | Auto | 22.2% | 86.2% | 25.11 | 12.55 | 4.03 | 0.0% | 7.10 | 0.08 | 1653.57 |
| 3 players | 1 | STRONG | Manual/Smart | 71.7% | 46.5% | 23.06 | 3.84 | 4.32 | 0.0% | 36.91 | 0.66 | 7175.95 |
| 3 players | 1 | STRONG | Auto | 40.0% | 73.1% | 24.46 | 12.23 | 3.80 | 0.0% | 8.85 | 0.11 | 1881.54 |
| 3 players | 2 | RECOMMENDED | Manual/Smart | 27.5% | 84.9% | 49.39 | 8.23 | 7.60 | 0.6% | 15.18 | 0.18 | 6756.57 |
| 3 players | 2 | RECOMMENDED | Auto | 4.1% | 97.9% | 51.78 | 25.89 | 7.72 | 1.8% | 3.70 | 0.04 | 1911.29 |
| 3 players | 2 | STRONG | Manual/Smart | 56.8% | 65.7% | 46.61 | 7.77 | 6.95 | 0.2% | 21.17 | 0.31 | 7941.24 |
| 3 players | 2 | STRONG | Auto | 16.9% | 90.9% | 50.11 | 25.05 | 7.26 | 0.4% | 4.49 | 0.05 | 2119.31 |
| 3 players | 3 | RECOMMENDED | Manual/Smart | 30.3% | 77.1% | 76.93 | 12.82 | 11.57 | 51.8% | 13.22 | 0.18 | 9376.07 |
| 3 players | 3 | RECOMMENDED | Auto | 3.4% | 97.7% | 80.84 | 40.42 | 11.01 | 50.2% | 3.12 | 0.04 | 2676.72 |
| 3 players | 3 | STRONG | Manual/Smart | 65.2% | 46.7% | 73.78 | 12.30 | 11.39 | 25.7% | 18.36 | 0.29 | 10985.84 |
| 3 players | 3 | STRONG | Auto | 19.6% | 86.1% | 79.30 | 39.65 | 11.28 | 49.0% | 3.83 | 0.05 | 2906.96 |
| 4 players | 1 | RECOMMENDED | Manual/Smart | 71.8% | 49.9% | 23.53 | 3.92 | 4.97 | 0.0% | 63.34 | 1.13 | 8454.26 |
| 4 players | 1 | RECOMMENDED | Auto | 38.1% | 77.4% | 25.28 | 12.64 | 4.59 | 0.0% | 14.65 | 0.21 | 2167.44 |
| 4 players | 1 | STRONG | Manual/Smart | 85.4% | 34.7% | 22.24 | 3.71 | 4.36 | 0.0% | 76.16 | 1.44 | 9809.84 |
| 4 players | 1 | STRONG | Auto | 57.5% | 63.1% | 24.22 | 12.11 | 4.13 | 0.0% | 18.37 | 0.29 | 2504.95 |
| 4 players | 2 | RECOMMENDED | Manual/Smart | 46.0% | 75.8% | 49.61 | 8.27 | 8.46 | 0.0% | 32.13 | 0.48 | 8623.99 |
| 4 players | 2 | RECOMMENDED | Auto | 9.9% | 95.5% | 53.61 | 26.81 | 8.66 | 0.0% | 6.81 | 0.08 | 2309.37 |
| 4 players | 2 | STRONG | Manual/Smart | 76.7% | 54.2% | 45.58 | 7.60 | 7.25 | 0.0% | 44.39 | 0.76 | 10472.57 |
| 4 players | 2 | STRONG | Auto | 37.0% | 81.3% | 51.01 | 25.50 | 8.14 | 0.0% | 9.62 | 0.14 | 2682.38 |
| 4 players | 3 | RECOMMENDED | Manual/Smart | 56.9% | 57.8% | 76.19 | 12.70 | 14.28 | 10.5% | 29.86 | 0.49 | 12538.02 |
| 4 players | 3 | RECOMMENDED | Auto | 11.9% | 92.5% | 81.02 | 40.51 | 13.10 | 12.5% | 6.11 | 0.09 | 3389.53 |
| 4 players | 3 | STRONG | Manual/Smart | 83.7% | 30.9% | 71.97 | 12.00 | 13.50 | 2.2% | 38.51 | 0.70 | 14605.43 |
| 4 players | 3 | STRONG | Auto | 45.0% | 68.2% | 78.67 | 39.33 | 13.58 | 7.7% | 8.67 | 0.14 | 3881.78 |
| 5 balanced (size comparison) | 1 | RECOMMENDED | Manual/Smart | 80.8% | 42.5% | 23.12 | 3.85 | 5.04 | 0.0% | 100.94 | 1.94 | 10642.88 |
| 5 balanced (size comparison) | 1 | RECOMMENDED | Auto | 52.1% | 69.6% | 25.31 | 12.66 | 5.01 | 0.0% | 23.79 | 0.39 | 2712.60 |
| 5 balanced (size comparison) | 1 | STRONG | Manual/Smart | 92.0% | 28.3% | 21.72 | 3.62 | 4.31 | 0.0% | 117.91 | 2.41 | 12319.55 |
| 5 balanced (size comparison) | 1 | STRONG | Auto | 73.5% | 51.9% | 23.89 | 11.94 | 4.50 | 0.0% | 30.30 | 0.55 | 3249.79 |
| 5 balanced (size comparison) | 2 | RECOMMENDED | Manual/Smart | 68.1% | 63.0% | 49.16 | 8.19 | 9.18 | 0.0% | 55.48 | 0.91 | 10970.34 |
| 5 balanced (size comparison) | 2 | RECOMMENDED | Auto | 23.9% | 89.6% | 54.92 | 27.46 | 9.80 | 0.0% | 11.12 | 0.16 | 2771.80 |
| 5 balanced (size comparison) | 2 | STRONG | Manual/Smart | 91.1% | 41.6% | 44.12 | 7.35 | 7.40 | 0.0% | 73.40 | 1.32 | 13506.66 |
| 5 balanced (size comparison) | 2 | STRONG | Auto | 58.6% | 70.1% | 50.77 | 25.38 | 8.76 | 0.0% | 16.44 | 0.26 | 3384.76 |
| 5 balanced (size comparison) | 3 | RECOMMENDED | Manual/Smart | 68.9% | 50.5% | 75.34 | 12.56 | 15.70 | 0.4% | 46.90 | 0.85 | 15474.88 |
| 5 balanced (size comparison) | 3 | RECOMMENDED | Auto | 19.6% | 88.5% | 81.24 | 40.62 | 14.49 | 0.8% | 9.49 | 0.14 | 4086.48 |
| 5 balanced (size comparison) | 3 | STRONG | Manual/Smart | 88.9% | 28.7% | 70.66 | 11.78 | 14.49 | 0.1% | 57.68 | 1.08 | 17799.54 |
| 5 balanced (size comparison) | 3 | STRONG | Auto | 57.4% | 61.7% | 78.53 | 39.26 | 14.98 | 0.3% | 13.75 | 0.23 | 4719.96 |

## Manual vs RANDOM Auto

| Floor | Gear | BASIC_SMART clear | Auto clear | Difference | Manual min/run | Auto min/run |
|---:|---|---:|---:|---:|---:|---:|
| 1 | RECOMMENDED | 81.1% | 52.3% | 28.9 pp | 3.86 | 12.66 |
| 1 | STRONG | 92.2% | 74.7% | 17.5 pp | 3.62 | 11.92 |
| 2 | RECOMMENDED | 67.3% | 23.9% | 43.4 pp | 8.20 | 27.44 |
| 2 | STRONG | 90.8% | 58.0% | 32.8 pp | 7.35 | 25.41 |
| 3 | RECOMMENDED | 68.3% | 19.2% | 49.1 pp | 12.56 | 40.60 |
| 3 | STRONG | 89.6% | 57.7% | 31.9 pp | 11.77 | 39.22 |

## Economy after failure retention

Failure runs retain 50%; time from failed runs is included.

| Composition | Floor | Coins/run | Coins/hour | Retained resources/run | Resources/hour | Recipes/100 runs | Recipes/hour | Retained loot value/run |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 combat | 1 | 1006.81 | 18420.74 | 1.37 | 25.09 | 0.00 | 0.00 | 1.37 |
| 5 combat | 2 | 2192.77 | 19203.09 | 1.82 | 15.96 | 0.00 | 0.00 | 1.82 |
| 5 combat | 3 | 4479.25 | 24229.90 | 2.23 | 12.06 | 0.00 | 0.00 | 2.23 |
| 5 balanced | 1 | 684.01 | 10642.86 | 6.50 | 101.20 | 13.41 | 2.00 | 6.63 |
| 5 balanced | 2 | 1494.64 | 10932.44 | 7.54 | 55.11 | 14.13 | 0.92 | 7.66 |
| 5 balanced | 3 | 3232.98 | 15442.93 | 9.84 | 46.99 | 19.94 | 0.84 | 10.01 |
| 3 combat + 2 professions | 1 | 766.26 | 12846.36 | 4.80 | 80.44 | 8.85 | 1.42 | 4.88 |
| 3 combat + 2 professions | 2 | 1691.96 | 13453.34 | 5.71 | 45.42 | 9.35 | 0.68 | 5.80 |
| 3 combat + 2 professions | 3 | 3469.51 | 17648.23 | 6.73 | 34.24 | 12.29 | 0.54 | 6.84 |
| Duplicate profession | 1 | 688.29 | 10604.19 | 4.67 | 71.97 | 9.07 | 1.34 | 4.76 |
| Duplicate profession | 2 | 1498.28 | 10845.60 | 5.35 | 38.71 | 10.11 | 0.65 | 5.44 |
| Duplicate profession | 3 | 3288.20 | 15588.91 | 7.12 | 33.77 | 13.83 | 0.60 | 7.25 |
| 3 players | 1 | 419.68 | 6282.24 | 2.05 | 30.69 | 3.93 | 0.51 | 2.08 |
| 3 players | 2 | 926.93 | 6756.57 | 2.08 | 15.18 | 3.71 | 0.18 | 2.11 |
| 3 players | 3 | 2003.55 | 9376.07 | 2.83 | 13.22 | 5.30 | 0.18 | 2.86 |
| 4 players | 1 | 552.66 | 8454.26 | 4.14 | 63.34 | 7.96 | 1.13 | 4.21 |
| 4 players | 2 | 1188.37 | 8623.99 | 4.43 | 32.13 | 8.28 | 0.48 | 4.49 |
| 4 players | 3 | 2653.70 | 12538.02 | 6.32 | 29.86 | 12.36 | 0.49 | 6.42 |
| 5 balanced (size comparison) | 1 | 683.37 | 10642.88 | 6.48 | 100.94 | 13.03 | 1.94 | 6.61 |
| 5 balanced (size comparison) | 2 | 1498.14 | 10970.34 | 7.58 | 55.48 | 13.90 | 0.91 | 7.70 |
| 5 balanced (size comparison) | 3 | 3238.48 | 15474.88 | 9.82 | 46.90 | 20.14 | 0.85 | 9.99 |
| 1 player (combat) | 1 | 160.07 | 1838.81 | 0.18 | 2.12 | 0.00 | 0.00 | 0.18 |
| 1 player (combat) | 2 | 369.90 | 2284.57 | 0.21 | 1.32 | 0.00 | 0.00 | 0.21 |
| 1 player (combat) | 3 | 715.78 | 2908.54 | 0.24 | 0.96 | 0.00 | 0.00 | 0.24 |
| 1 player (profession) | 1 | 69.02 | 728.60 | 0.91 | 9.61 | 2.28 | 0.13 | 0.92 |
| 1 player (profession) | 2 | 187.25 | 1119.15 | 1.18 | 7.08 | 2.89 | 0.09 | 1.20 |
| 1 player (profession) | 3 | 393.16 | 1534.97 | 1.50 | 5.84 | 4.26 | 0.08 | 1.52 |
| 2 players (combat) | 1 | 347.77 | 5122.54 | 0.46 | 6.83 | 0.00 | 0.00 | 0.46 |
| 2 players (combat) | 2 | 799.13 | 5786.06 | 0.55 | 4.00 | 0.00 | 0.00 | 0.55 |
| 2 players (combat) | 3 | 1645.95 | 7575.71 | 0.68 | 3.12 | 0.00 | 0.00 | 0.68 |
| 2 players (mixed) | 1 | 263.83 | 3232.37 | 1.83 | 22.47 | 3.42 | 0.36 | 1.86 |
| 2 players (mixed) | 2 | 602.50 | 3680.38 | 2.06 | 12.59 | 3.99 | 0.18 | 2.09 |
| 2 players (mixed) | 3 | 1221.55 | 4948.92 | 2.39 | 9.68 | 5.10 | 0.14 | 2.42 |

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
