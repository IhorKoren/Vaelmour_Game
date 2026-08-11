# Phase 7 Progression Report

The level curve remains uncapped: XP_REQUIRED(level) = round(100 × level^1.35), with +1 Attack and +5 Max HP per level.

| Level | XP to next | Cumulative XP on arrival |
|---:|---:|---:|
| 1 | 100 | 0 |
| 5 | 878 | 1446 |
| 10 | 2239 | 8428 |
| 20 | 5707 | 45742 |
| 30 | 9865 | 121039 |
| 50 | 19661 | 408529 |
| 75 | 33989 | 1067790 |
| 100 | 50119 | 2107701 |

## Expected base XP per successful floor

- Floor 1: 554 base XP; 6 encounters.
- Floor 2: 1321 base XP; 8 encounters.
- Floor 3: 2647 base XP; 10 encounters.

## Estimated successful runs per level

| Floor | Level (low/mid/high recommendation) | Runs for next level at base XP |
|---:|---|---|
| 1 | 1 / 6 / 10 | 0.2 / 2.0 / 4.0 |
| 2 | 8 / 14 / 20 | 1.3 / 2.7 / 4.3 |
| 3 | 18 / 27 / 35 | 1.9 / 3.2 / 4.6 |

## Low-level enemy penalty

- Level difference ≤3: 100% XP.
- Level difference 4–6: 75% XP.
- Level difference 7–10: 50% XP.
- Level difference 11–15: 25% XP.
- Level difference 16–∞: 10% XP.

Coins and profession resources are not reduced by this penalty.
