# Phase 8.2 Economy Supply Model

Deterministic macro model extended for Phase 10 gathering. Paid slots and direct trades are transfers, not sinks. Resource share models each Rift run as 2.45 expected profession resources and each gathering hour as 10.5 blended resources.

| Population | Day | Minted | Burned | Net | Net inflation / minted | Median wallet | P90 wallet | Gini | Market tx/player/day | Fee burn | Guild burn | Net coins/player/day | Gathering share |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 1 | 796 | 7 | 789 | 99.1% | 80 | 226 | 0.517 | 0.70 | 7 | 0 | 78.9 | 80.4% |
| 10 | 7 | 5 932 | 528 | 5 404 | 91.1% | 441 | 1597 | 0.417 | 0.40 | 28 | 500 | 77.2 | 80.4% |
| 10 | 30 | 25 728 | 147 | 25 581 | 99.4% | 1543 | 9133 | 0.477 | 0.49 | 147 | 0 | 85.3 | 80.4% |
| 10 | 90 | 76 489 | 404 | 76 085 | 99.5% | 4570 | 26545 | 0.458 | 0.45 | 404 | 0 | 84.5 | 80.4% |
| 100 | 1 | 9 686 | 57 | 9 629 | 99.4% | 78 | 247 | 0.541 | 0.57 | 57 | 0 | 96.3 | 80.4% |
| 100 | 7 | 67 949 | 441 | 67 508 | 99.4% | 500 | 2017 | 0.503 | 0.63 | 441 | 0 | 96.4 | 80.4% |
| 100 | 30 | 289 613 | 2 439 | 287 174 | 99.2% | 1900 | 8491 | 0.483 | 0.65 | 1939 | 500 | 95.7 | 80.4% |
| 100 | 90 | 870 218 | 6 881 | 863 337 | 99.2% | 5374 | 26394 | 0.477 | 0.65 | 5881 | 1000 | 95.9 | 80.4% |
| 1 000 | 1 | 98 327 | 601 | 97 726 | 99.4% | 73 | 254 | 0.529 | 0.60 | 601 | 0 | 97.7 | 80.4% |
| 1 000 | 7 | 686 425 | 12 084 | 674 341 | 98.2% | 462 | 1955 | 0.497 | 0.65 | 4584 | 7500 | 96.3 | 80.4% |
| 1 000 | 30 | 2 943 081 | 27 903 | 2 915 178 | 99.1% | 1859 | 8688 | 0.487 | 0.66 | 19903 | 8000 | 97.2 | 80.4% |
| 1 000 | 90 | 8 836 454 | 65 855 | 8 770 599 | 99.3% | 5655 | 26103 | 0.489 | 0.67 | 59855 | 6000 | 97.5 | 80.4% |

## Recommendation

Gathering is the primary profession-resource source in the modeled profile mix; Rift rewards remain a meaningful secondary source. Do not auto-tune from synthetic results: compare with production telemetry before changing yields. Paid party slots and player trades must never be counted as burns.
