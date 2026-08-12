# Phase 10 Profession Economy Report

Deterministic profession model using the production yield and mastery formulas. The resource catalog remains the existing 54 resources; no new currency or item family is introduced.

## Yield by tier and role

Resources per hour at the tier's entry mastery and neutral RNG. Columns are 10m, 1h, 4h, and 8h. Integer rounding is visible on short jobs; the configured duration bonus itself is 0%, 1%, 3%, and 5%.

| Tier | Role | 10m | 1h | 4h | 8h |
|---:|---|---:|---:|---:|---:|
| 1 | COMMON | 18.00 | 18.00 | 18.50 | 18.88 |
| 1 | SECONDARY | 12.00 | 12.00 | 12.25 | 12.63 |
| 1 | CORE | 12.00 | 10.00 | 10.25 | 10.50 |
| 2 | COMMON | 18.00 | 17.00 | 16.75 | 17.13 |
| 2 | SECONDARY | 12.00 | 11.00 | 11.25 | 11.50 |
| 2 | CORE | 12.00 | 9.00 | 9.25 | 9.50 |
| 3 | COMMON | 12.00 | 15.00 | 15.50 | 15.75 |
| 3 | SECONDARY | 12.00 | 10.00 | 10.25 | 10.50 |
| 3 | CORE | 6.00 | 8.00 | 8.50 | 8.75 |
| 4 | COMMON | 12.00 | 14.00 | 14.25 | 14.50 |
| 4 | SECONDARY | 12.00 | 9.00 | 9.50 | 9.75 |
| 4 | CORE | 6.00 | 8.00 | 8.00 | 8.13 |
| 5 | COMMON | 12.00 | 13.00 | 13.25 | 13.50 |
| 5 | SECONDARY | 6.00 | 9.00 | 8.75 | 9.00 |
| 5 | CORE | 6.00 | 7.00 | 7.25 | 7.50 |
| 6 | COMMON | 12.00 | 12.00 | 12.25 | 12.63 |
| 6 | SECONDARY | 6.00 | 8.00 | 8.25 | 8.38 |
| 6 | CORE | 6.00 | 7.00 | 6.75 | 7.00 |

## Mastery pacing

- Level range: 1–60; XP is awarded only when a completed job is collected.
- XP-to-next-level: `50 + level × 10`.
- A continuous optimal-tier path from mastery 1 to 60 is approximately **408.2 hours** (17.0 days). This intentionally avoids both same-day completion and multi-year pacing.
- Unlock thresholds: Tier I/II/III/IV/V/VI at mastery 1/10/20/30/40/50, with the separate Rift-floor gates enforced by the server.

## Gathering versus Rift supply

The extended mixed-player economy model estimates **80.4% gathering / 19.6% Rift** profession-resource supply. Assumptions: 10.5 blended gathering resources/hour and 2.45 profession resources/Rift run across the existing casual, active, hardcore, trader, and profession-focused profile mix.

Verdict: the result is inside the 70–90% gathering / 10–30% PvE guideline. Gathering is the primary source while existing Rift drops remain relevant. Recalibrate only after comparing these synthetic assumptions with telemetry.
