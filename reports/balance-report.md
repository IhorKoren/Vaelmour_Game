# Phase 7 Balance Report

Seeded deterministic simulation using the production combat engine. Runs per scenario: **10 000**. RANDOM represents Auto Battle (no potions); BASIC_SMART is manual-ish play and never reads future enemy RNG. Manual time assumes 10 seconds/round; Auto assumes 30 seconds/round.

| Composition | Floor | Gear | Behavior | Clear | Death | Rounds/enc. | Total rounds | Potions | XP/run | Coins/run | Resources/run | Recipes/run | Extracted value |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A_5_COMBAT | 1 | UNDERGEARED | BASIC_SMART | 82.2% | 42.1% | 3.61 | 20.99 | 5.62 | 2262.91 | 912.68 | 1.40 | 0.00 | 1.28 |
| A_5_COMBAT | 1 | UNDERGEARED | RANDOM | 58.8% | 65.6% | 3.79 | 21.19 | 0.00 | 1975.19 | 781.18 | 1.34 | 0.00 | 1.08 |
| A_5_COMBAT | 1 | RECOMMENDED | BASIC_SMART | 90.4% | 30.7% | 3.35 | 19.75 | 5.12 | 2351.62 | 976.19 | 1.41 | 0.00 | 1.35 |
| A_5_COMBAT | 1 | RECOMMENDED | RANDOM | 74.7% | 52.2% | 3.53 | 20.28 | 0.00 | 2089.95 | 856.43 | 1.37 | 0.00 | 1.22 |
| A_5_COMBAT | 1 | STRONG | BASIC_SMART | 99.6% | 7.7% | 2.75 | 16.48 | 3.28 | 2367.83 | 1102.76 | 1.48 | 0.00 | 1.47 |
| A_5_COMBAT | 1 | STRONG | RANDOM | 96.7% | 22.6% | 2.96 | 17.64 | 0.00 | 2188.36 | 1020.51 | 1.44 | 0.00 | 1.42 |
| A_5_COMBAT | 2 | UNDERGEARED | BASIC_SMART | 29.8% | 86.4% | 6.71 | 48.96 | 12.67 | 4526.24 | 1713.24 | 1.72 | 0.00 | 1.13 |
| A_5_COMBAT | 2 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 6.58 | 41.46 | 0.00 | 3069.36 | 1127.29 | 1.34 | 0.00 | 0.67 |
| A_5_COMBAT | 2 | RECOMMENDED | BASIC_SMART | 90.9% | 41.5% | 4.93 | 38.95 | 8.83 | 5433.14 | 2192.25 | 1.90 | 0.00 | 1.83 |
| A_5_COMBAT | 2 | RECOMMENDED | RANDOM | 1.5% | 99.5% | 5.81 | 40.57 | 0.00 | 3658.72 | 1443.32 | 1.59 | 0.00 | 0.81 |
| A_5_COMBAT | 2 | STRONG | BASIC_SMART | 100.0% | 8.5% | 3.95 | 31.64 | 5.23 | 5423.86 | 2520.01 | 1.95 | 0.00 | 1.95 |
| A_5_COMBAT | 2 | STRONG | RANDOM | 31.9% | 86.6% | 5.21 | 38.13 | 0.00 | 3424.68 | 1667.54 | 1.71 | 0.00 | 1.15 |
| A_5_COMBAT | 3 | UNDERGEARED | BASIC_SMART | 0.3% | 99.9% | 7.68 | 68.85 | 17.39 | 8995.78 | 3269.25 | 2.14 | 0.00 | 1.07 |
| A_5_COMBAT | 3 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 7.41 | 46.50 | 0.00 | 5045.79 | 1816.23 | 1.41 | 0.00 | 0.70 |
| A_5_COMBAT | 3 | RECOMMENDED | BASIC_SMART | 91.6% | 23.8% | 6.22 | 61.72 | 17.47 | 11105.12 | 4659.03 | 2.43 | 0.00 | 2.33 |
| A_5_COMBAT | 3 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 6.54 | 49.77 | 0.00 | 5729.78 | 2494.01 | 1.75 | 0.00 | 0.88 |
| A_5_COMBAT | 3 | STRONG | BASIC_SMART | 100.0% | 0.3% | 5.17 | 51.75 | 11.11 | 9082.56 | 5049.68 | 2.51 | 0.00 | 2.51 |
| A_5_COMBAT | 3 | STRONG | RANDOM | 0.2% | 99.9% | 5.79 | 50.99 | 0.00 | 4584.04 | 3107.23 | 2.08 | 0.00 | 1.04 |
| B_BALANCED | 1 | UNDERGEARED | BASIC_SMART | 70.5% | 53.4% | 4.44 | 25.32 | 8.13 | 2127.63 | 636.61 | 6.81 | 0.24 | 6.19 |
| B_BALANCED | 1 | UNDERGEARED | RANDOM | 19.4% | 91.0% | 4.76 | 24.73 | 0.00 | 1662.03 | 478.83 | 5.90 | 0.14 | 3.69 |
| B_BALANCED | 1 | RECOMMENDED | BASIC_SMART | 85.1% | 38.3% | 4.03 | 23.60 | 7.37 | 2259.64 | 699.35 | 7.15 | 0.28 | 6.99 |
| B_BALANCED | 1 | RECOMMENDED | RANDOM | 36.3% | 81.3% | 4.43 | 23.76 | 0.00 | 1734.72 | 521.92 | 6.09 | 0.16 | 4.40 |
| B_BALANCED | 1 | STRONG | BASIC_SMART | 99.0% | 12.6% | 3.34 | 19.98 | 5.03 | 2309.12 | 807.88 | 7.72 | 0.34 | 8.03 |
| B_BALANCED | 1 | STRONG | RANDOM | 83.7% | 41.9% | 3.56 | 20.79 | 0.00 | 1955.08 | 689.17 | 6.98 | 0.26 | 6.77 |
| B_BALANCED | 2 | UNDERGEARED | BASIC_SMART | 8.8% | 96.4% | 8.17 | 57.91 | 13.74 | 4192.05 | 1182.69 | 7.84 | 0.19 | 4.42 |
| B_BALANCED | 2 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 7.95 | 44.84 | 0.00 | 2578.50 | 702.26 | 5.60 | 0.08 | 2.84 |
| B_BALANCED | 2 | RECOMMENDED | BASIC_SMART | 73.3% | 59.7% | 6.24 | 48.28 | 11.51 | 5004.54 | 1511.43 | 8.89 | 0.29 | 8.12 |
| B_BALANCED | 2 | RECOMMENDED | RANDOM | 0.1% | 100.0% | 6.72 | 45.76 | 0.00 | 3364.25 | 992.74 | 6.96 | 0.15 | 3.56 |
| B_BALANCED | 2 | STRONG | BASIC_SMART | 100.0% | 11.9% | 4.64 | 37.15 | 6.83 | 5350.42 | 1878.17 | 10.09 | 0.40 | 10.49 |
| B_BALANCED | 2 | STRONG | RANDOM | 8.5% | 96.9% | 6.21 | 43.95 | 0.00 | 3082.94 | 1141.37 | 7.63 | 0.19 | 4.28 |
| B_BALANCED | 3 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 8.79 | 77.99 | 17.74 | 8739.65 | 2415.96 | 9.60 | 0.23 | 4.92 |
| B_BALANCED | 3 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 8.64 | 49.52 | 0.00 | 4428.66 | 1205.88 | 5.75 | 0.08 | 2.92 |
| B_BALANCED | 3 | RECOMMENDED | BASIC_SMART | 78.9% | 40.7% | 7.33 | 71.77 | 18.60 | 10471.28 | 3340.98 | 11.55 | 0.40 | 10.86 |
| B_BALANCED | 3 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 7.42 | 53.09 | 0.00 | 5188.33 | 1736.16 | 7.65 | 0.15 | 3.90 |
| B_BALANCED | 3 | STRONG | BASIC_SMART | 100.0% | 0.3% | 5.90 | 59.04 | 12.53 | 9082.43 | 3832.47 | 12.52 | 0.52 | 13.04 |
| B_BALANCED | 3 | STRONG | RANDOM | 0.0% | 100.0% | 6.57 | 55.92 | 0.00 | 4160.79 | 2216.84 | 9.06 | 0.21 | 4.63 |
| C_3_COMBAT_2_PROF | 1 | UNDERGEARED | BASIC_SMART | 68.5% | 54.9% | 4.09 | 23.27 | 6.93 | 2109.08 | 700.08 | 4.99 | 0.16 | 4.48 |
| C_3_COMBAT_2_PROF | 1 | UNDERGEARED | RANDOM | 31.0% | 84.0% | 4.33 | 23.02 | 0.00 | 1747.54 | 565.83 | 4.46 | 0.10 | 3.08 |
| C_3_COMBAT_2_PROF | 1 | RECOMMENDED | BASIC_SMART | 81.5% | 41.3% | 3.79 | 22.04 | 6.43 | 2223.76 | 762.76 | 5.19 | 0.17 | 4.97 |
| C_3_COMBAT_2_PROF | 1 | RECOMMENDED | RANDOM | 49.8% | 72.1% | 4.02 | 22.11 | 0.00 | 1847.09 | 623.65 | 4.61 | 0.12 | 3.65 |
| C_3_COMBAT_2_PROF | 1 | STRONG | BASIC_SMART | 98.8% | 12.5% | 3.10 | 18.55 | 4.41 | 2309.63 | 897.25 | 5.60 | 0.23 | 5.80 |
| C_3_COMBAT_2_PROF | 1 | STRONG | RANDOM | 88.3% | 36.7% | 3.27 | 19.27 | 0.00 | 2017.50 | 787.42 | 5.22 | 0.18 | 5.15 |
| C_3_COMBAT_2_PROF | 2 | UNDERGEARED | BASIC_SMART | 11.9% | 95.0% | 7.47 | 53.17 | 13.13 | 4230.75 | 1333.92 | 5.71 | 0.13 | 3.31 |
| C_3_COMBAT_2_PROF | 2 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 7.25 | 42.39 | 0.00 | 2717.17 | 832.72 | 4.15 | 0.06 | 2.10 |
| C_3_COMBAT_2_PROF | 2 | RECOMMENDED | BASIC_SMART | 75.4% | 57.6% | 5.70 | 44.20 | 10.57 | 5048.30 | 1697.90 | 6.52 | 0.20 | 6.00 |
| C_3_COMBAT_2_PROF | 2 | RECOMMENDED | RANDOM | 0.3% | 99.9% | 6.22 | 42.82 | 0.00 | 3452.79 | 1143.58 | 5.09 | 0.10 | 2.60 |
| C_3_COMBAT_2_PROF | 2 | STRONG | BASIC_SMART | 100.0% | 12.1% | 4.33 | 34.66 | 6.32 | 5345.92 | 2082.45 | 7.32 | 0.27 | 7.59 |
| C_3_COMBAT_2_PROF | 2 | STRONG | RANDOM | 12.9% | 95.1% | 5.75 | 40.98 | 0.00 | 3151.71 | 1300.01 | 5.65 | 0.12 | 3.30 |
| C_3_COMBAT_2_PROF | 3 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 8.21 | 72.91 | 17.55 | 8737.48 | 2673.52 | 7.05 | 0.15 | 3.60 |
| C_3_COMBAT_2_PROF | 3 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 8.05 | 46.77 | 0.00 | 4496.06 | 1358.54 | 4.27 | 0.05 | 2.16 |
| C_3_COMBAT_2_PROF | 3 | RECOMMENDED | BASIC_SMART | 77.3% | 41.3% | 6.90 | 67.42 | 18.35 | 10421.59 | 3674.99 | 8.39 | 0.27 | 7.81 |
| C_3_COMBAT_2_PROF | 3 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 6.98 | 50.36 | 0.00 | 5260.15 | 1943.99 | 5.71 | 0.09 | 2.90 |
| C_3_COMBAT_2_PROF | 3 | STRONG | BASIC_SMART | 100.0% | 0.5% | 5.57 | 55.71 | 12.39 | 9075.34 | 4235.21 | 9.19 | 0.33 | 9.52 |
| C_3_COMBAT_2_PROF | 3 | STRONG | RANDOM | 0.1% | 100.0% | 6.19 | 52.96 | 0.00 | 4208.05 | 2468.61 | 6.76 | 0.13 | 3.45 |
| D_DUPLICATE_PROF | 1 | UNDERGEARED | BASIC_SMART | 72.8% | 50.9% | 4.46 | 25.57 | 8.29 | 2156.93 | 645.14 | 4.89 | 0.18 | 4.50 |
| D_DUPLICATE_PROF | 1 | UNDERGEARED | RANDOM | 17.6% | 91.8% | 4.82 | 24.95 | 0.00 | 1651.62 | 474.76 | 4.14 | 0.09 | 2.56 |
| D_DUPLICATE_PROF | 1 | RECOMMENDED | BASIC_SMART | 86.9% | 36.1% | 4.06 | 23.85 | 7.55 | 2285.76 | 706.51 | 5.12 | 0.20 | 5.06 |
| D_DUPLICATE_PROF | 1 | RECOMMENDED | RANDOM | 34.9% | 82.2% | 4.49 | 24.01 | 0.00 | 1724.25 | 518.08 | 4.30 | 0.11 | 3.09 |
| D_DUPLICATE_PROF | 1 | STRONG | BASIC_SMART | 99.2% | 11.8% | 3.35 | 20.09 | 5.00 | 2318.97 | 810.86 | 5.38 | 0.23 | 5.59 |
| D_DUPLICATE_PROF | 1 | STRONG | RANDOM | 86.3% | 38.7% | 3.57 | 20.91 | 0.00 | 1993.92 | 700.35 | 5.05 | 0.19 | 4.95 |
| D_DUPLICATE_PROF | 2 | UNDERGEARED | BASIC_SMART | 9.1% | 96.3% | 8.31 | 58.92 | 14.13 | 4184.96 | 1178.58 | 5.48 | 0.13 | 3.10 |
| D_DUPLICATE_PROF | 2 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 8.11 | 45.76 | 0.00 | 2573.15 | 700.86 | 4.05 | 0.06 | 2.06 |
| D_DUPLICATE_PROF | 2 | RECOMMENDED | BASIC_SMART | 76.7% | 57.3% | 6.29 | 48.85 | 11.87 | 5054.26 | 1523.45 | 6.40 | 0.22 | 5.96 |
| D_DUPLICATE_PROF | 2 | RECOMMENDED | RANDOM | 0.1% | 100.0% | 6.82 | 46.34 | 0.00 | 3348.50 | 986.89 | 5.06 | 0.11 | 2.58 |
| D_DUPLICATE_PROF | 2 | STRONG | BASIC_SMART | 100.0% | 11.8% | 4.71 | 37.65 | 6.90 | 5352.08 | 1877.01 | 7.04 | 0.29 | 7.33 |
| D_DUPLICATE_PROF | 2 | STRONG | RANDOM | 6.7% | 97.5% | 6.29 | 44.46 | 0.00 | 3060.05 | 1133.37 | 5.39 | 0.12 | 2.97 |
| D_DUPLICATE_PROF | 3 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 8.88 | 78.85 | 17.66 | 8754.75 | 2417.61 | 6.85 | 0.16 | 3.51 |
| D_DUPLICATE_PROF | 3 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 8.76 | 50.39 | 0.00 | 4453.98 | 1209.64 | 4.27 | 0.06 | 2.16 |
| D_DUPLICATE_PROF | 3 | RECOMMENDED | BASIC_SMART | 81.0% | 37.9% | 7.39 | 72.50 | 18.69 | 10592.65 | 3378.86 | 8.17 | 0.27 | 7.74 |
| D_DUPLICATE_PROF | 3 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 7.51 | 53.64 | 0.00 | 5171.98 | 1729.05 | 5.43 | 0.09 | 2.76 |
| D_DUPLICATE_PROF | 3 | STRONG | BASIC_SMART | 100.0% | 0.3% | 5.96 | 59.60 | 12.51 | 9082.56 | 3832.30 | 8.67 | 0.33 | 9.01 |
| D_DUPLICATE_PROF | 3 | STRONG | RANDOM | 0.0% | 100.0% | 6.64 | 56.60 | 0.00 | 4183.81 | 2224.93 | 6.41 | 0.15 | 3.28 |
| E_3_PLAYERS | 1 | UNDERGEARED | BASIC_SMART | 0.3% | 99.8% | 6.14 | 29.91 | 8.34 | 873.06 | 282.52 | 2.14 | 0.03 | 1.09 |
| E_3_PLAYERS | 1 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 5.63 | 21.64 | 0.00 | 546.84 | 168.60 | 1.57 | 0.02 | 0.79 |
| E_3_PLAYERS | 1 | RECOMMENDED | BASIC_SMART | 1.0% | 99.5% | 5.96 | 29.50 | 8.15 | 876.32 | 294.38 | 2.18 | 0.04 | 1.12 |
| E_3_PLAYERS | 1 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 5.42 | 22.11 | 0.00 | 576.12 | 188.64 | 1.70 | 0.02 | 0.86 |
| E_3_PLAYERS | 1 | STRONG | BASIC_SMART | 12.7% | 92.3% | 5.53 | 28.31 | 7.66 | 806.29 | 326.97 | 2.31 | 0.04 | 1.36 |
| E_3_PLAYERS | 1 | STRONG | RANDOM | 0.1% | 99.9% | 4.89 | 22.58 | 0.00 | 594.89 | 247.00 | 1.99 | 0.03 | 1.01 |
| E_3_PLAYERS | 2 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 9.98 | 49.40 | 9.19 | 1386.85 | 434.22 | 1.95 | 0.02 | 0.99 |
| E_3_PLAYERS | 2 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 9.71 | 28.24 | 0.00 | 803.87 | 247.82 | 1.23 | 0.01 | 0.62 |
| E_3_PLAYERS | 2 | RECOMMENDED | BASIC_SMART | 0.0% | 100.0% | 8.64 | 53.76 | 10.07 | 1828.97 | 626.26 | 2.49 | 0.04 | 1.27 |
| E_3_PLAYERS | 2 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 8.26 | 30.93 | 0.00 | 958.58 | 320.19 | 1.47 | 0.01 | 0.74 |
| E_3_PLAYERS | 2 | STRONG | BASIC_SMART | 14.7% | 92.3% | 8.20 | 58.53 | 10.55 | 2103.90 | 881.20 | 3.13 | 0.07 | 1.86 |
| E_3_PLAYERS | 2 | STRONG | RANDOM | 0.0% | 100.0% | 7.34 | 34.03 | 0.00 | 776.78 | 391.29 | 1.75 | 0.02 | 0.89 |
| E_3_PLAYERS | 3 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 12.24 | 55.63 | 10.99 | 2177.87 | 679.92 | 1.82 | 0.02 | 0.92 |
| E_3_PLAYERS | 3 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 13.30 | 28.06 | 0.00 | 991.94 | 308.01 | 0.91 | 0.01 | 0.46 |
| E_3_PLAYERS | 3 | RECOMMENDED | BASIC_SMART | 0.0% | 100.0% | 10.25 | 74.03 | 11.74 | 3342.14 | 1267.87 | 3.16 | 0.05 | 1.60 |
| E_3_PLAYERS | 3 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 10.92 | 31.99 | 0.00 | 949.39 | 409.92 | 1.13 | 0.01 | 0.57 |
| E_3_PLAYERS | 3 | STRONG | BASIC_SMART | 1.1% | 99.3% | 9.22 | 82.74 | 11.91 | 3160.05 | 1768.86 | 3.99 | 0.09 | 2.06 |
| E_3_PLAYERS | 3 | STRONG | RANDOM | 0.0% | 100.0% | 9.32 | 35.57 | 0.00 | 615.93 | 550.08 | 1.49 | 0.01 | 0.75 |
| F_4_PLAYERS | 1 | UNDERGEARED | BASIC_SMART | 12.8% | 93.1% | 5.40 | 27.71 | 8.03 | 1312.81 | 397.22 | 4.08 | 0.09 | 2.40 |
| F_4_PLAYERS | 1 | UNDERGEARED | RANDOM | 0.5% | 99.8% | 5.01 | 24.63 | 0.00 | 1161.44 | 345.31 | 3.80 | 0.08 | 1.95 |
| F_4_PLAYERS | 1 | RECOMMENDED | BASIC_SMART | 22.4% | 86.9% | 5.19 | 27.10 | 7.86 | 1336.28 | 420.00 | 4.21 | 0.10 | 2.73 |
| F_4_PLAYERS | 1 | RECOMMENDED | RANDOM | 1.5% | 99.3% | 4.88 | 24.27 | 0.00 | 1164.60 | 359.81 | 3.90 | 0.08 | 2.03 |
| F_4_PLAYERS | 1 | STRONG | BASIC_SMART | 71.6% | 50.0% | 4.26 | 24.34 | 6.91 | 1487.11 | 551.61 | 4.74 | 0.16 | 4.32 |
| F_4_PLAYERS | 1 | STRONG | RANDOM | 15.5% | 91.9% | 4.49 | 23.14 | 0.00 | 1074.52 | 401.07 | 4.07 | 0.09 | 2.46 |
| F_4_PLAYERS | 2 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 8.80 | 57.83 | 12.12 | 2765.26 | 814.79 | 4.69 | 0.09 | 2.39 |
| F_4_PLAYERS | 2 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 8.39 | 36.82 | 0.00 | 1543.04 | 439.53 | 3.00 | 0.04 | 1.52 |
| F_4_PLAYERS | 2 | RECOMMENDED | BASIC_SMART | 6.0% | 97.3% | 7.73 | 54.48 | 11.55 | 3173.76 | 1000.17 | 5.38 | 0.12 | 2.94 |
| F_4_PLAYERS | 2 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 7.36 | 39.24 | 0.00 | 1807.54 | 561.13 | 3.69 | 0.05 | 1.87 |
| F_4_PLAYERS | 2 | STRONG | BASIC_SMART | 92.0% | 37.4% | 5.93 | 46.99 | 9.82 | 3830.09 | 1429.67 | 6.56 | 0.24 | 6.57 |
| F_4_PLAYERS | 2 | STRONG | RANDOM | 0.0% | 100.0% | 6.64 | 41.55 | 0.00 | 1726.84 | 725.48 | 4.37 | 0.08 | 2.22 |
| F_4_PLAYERS | 3 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 10.02 | 71.57 | 14.88 | 5154.90 | 1488.17 | 5.41 | 0.10 | 2.75 |
| F_4_PLAYERS | 3 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 10.85 | 37.01 | 0.00 | 2016.97 | 579.33 | 2.34 | 0.03 | 1.18 |
| F_4_PLAYERS | 3 | RECOMMENDED | BASIC_SMART | 1.0% | 99.5% | 8.74 | 78.42 | 15.11 | 6393.15 | 2137.04 | 6.94 | 0.16 | 3.59 |
| F_4_PLAYERS | 3 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 8.40 | 43.24 | 0.00 | 2469.93 | 907.12 | 3.59 | 0.05 | 1.82 |
| F_4_PLAYERS | 3 | STRONG | BASIC_SMART | 95.0% | 15.7% | 7.17 | 71.34 | 14.65 | 6812.59 | 3069.08 | 8.48 | 0.32 | 8.62 |
| F_4_PLAYERS | 3 | STRONG | RANDOM | 0.0% | 100.0% | 7.17 | 46.94 | 0.00 | 1788.42 | 1286.39 | 4.90 | 0.08 | 2.49 |
| G_5_PLAYERS | 1 | UNDERGEARED | BASIC_SMART | 70.1% | 53.3% | 4.44 | 25.33 | 8.12 | 2127.88 | 637.29 | 6.79 | 0.23 | 6.14 |
| G_5_PLAYERS | 1 | UNDERGEARED | RANDOM | 18.9% | 91.0% | 4.76 | 24.70 | 0.00 | 1660.14 | 478.01 | 5.89 | 0.14 | 3.67 |
| G_5_PLAYERS | 1 | RECOMMENDED | BASIC_SMART | 85.0% | 38.4% | 4.04 | 23.64 | 7.35 | 2258.09 | 698.66 | 7.17 | 0.28 | 7.01 |
| G_5_PLAYERS | 1 | RECOMMENDED | RANDOM | 35.2% | 81.7% | 4.44 | 23.74 | 0.00 | 1730.14 | 520.35 | 6.12 | 0.16 | 4.39 |
| G_5_PLAYERS | 1 | STRONG | BASIC_SMART | 99.0% | 12.4% | 3.33 | 19.97 | 5.00 | 2310.82 | 808.49 | 7.70 | 0.35 | 8.03 |
| G_5_PLAYERS | 1 | STRONG | RANDOM | 84.5% | 41.6% | 3.55 | 20.76 | 0.00 | 1958.70 | 690.56 | 6.99 | 0.26 | 6.80 |
| G_5_PLAYERS | 2 | UNDERGEARED | BASIC_SMART | 8.9% | 96.4% | 8.18 | 58.00 | 13.79 | 4195.38 | 1182.69 | 7.81 | 0.19 | 4.40 |
| G_5_PLAYERS | 2 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 7.95 | 44.88 | 0.00 | 2580.79 | 702.76 | 5.61 | 0.08 | 2.84 |
| G_5_PLAYERS | 2 | RECOMMENDED | BASIC_SMART | 74.0% | 59.7% | 6.24 | 48.30 | 11.51 | 5005.24 | 1511.04 | 8.91 | 0.29 | 8.16 |
| G_5_PLAYERS | 2 | RECOMMENDED | RANDOM | 0.1% | 100.0% | 6.72 | 45.79 | 0.00 | 3362.47 | 992.47 | 7.00 | 0.14 | 3.58 |
| G_5_PLAYERS | 2 | STRONG | BASIC_SMART | 100.0% | 11.6% | 4.64 | 37.15 | 6.84 | 5356.74 | 1879.90 | 10.08 | 0.42 | 10.50 |
| G_5_PLAYERS | 2 | STRONG | RANDOM | 7.7% | 97.3% | 6.21 | 43.90 | 0.00 | 3072.34 | 1138.07 | 7.60 | 0.18 | 4.22 |
| G_5_PLAYERS | 3 | UNDERGEARED | BASIC_SMART | 0.0% | 100.0% | 8.78 | 77.91 | 17.71 | 8739.83 | 2416.73 | 9.62 | 0.23 | 4.92 |
| G_5_PLAYERS | 3 | UNDERGEARED | RANDOM | 0.0% | 100.0% | 8.64 | 49.54 | 0.00 | 4434.85 | 1208.22 | 5.77 | 0.08 | 2.92 |
| G_5_PLAYERS | 3 | RECOMMENDED | BASIC_SMART | 77.8% | 40.9% | 7.34 | 71.76 | 18.61 | 10466.14 | 3339.07 | 11.53 | 0.40 | 10.79 |
| G_5_PLAYERS | 3 | RECOMMENDED | RANDOM | 0.0% | 100.0% | 7.43 | 53.14 | 0.00 | 5180.17 | 1732.75 | 7.66 | 0.14 | 3.90 |
| G_5_PLAYERS | 3 | STRONG | BASIC_SMART | 100.0% | 0.3% | 5.91 | 59.09 | 12.57 | 9080.78 | 3831.93 | 12.62 | 0.51 | 13.13 |
| G_5_PLAYERS | 3 | STRONG | RANDOM | 0.0% | 100.0% | 6.57 | 55.94 | 0.00 | 4169.86 | 2219.81 | 9.02 | 0.20 | 4.61 |

## Economy and recipe acquisition

- A_5_COMBAT, Floor 1: blacksmith 0.00, alchemist 0.00, jeweler 0.00 resources/run; 0.00 recipes/100 runs; recipe runs avg/median/p90 ∞/∞/∞; manual/auto estimate 3.29/9.88 min.
- A_5_COMBAT, Floor 2: blacksmith 0.00, alchemist 0.00, jeweler 0.00 resources/run; 0.00 recipes/100 runs; recipe runs avg/median/p90 ∞/∞/∞; manual/auto estimate 6.49/19.48 min.
- A_5_COMBAT, Floor 3: blacksmith 0.00, alchemist 0.00, jeweler 0.00 resources/run; 0.00 recipes/100 runs; recipe runs avg/median/p90 ∞/∞/∞; manual/auto estimate 10.29/30.86 min.
- B_BALANCED, Floor 1: blacksmith 2.24, alchemist 2.21, jeweler 2.15 resources/run; 27.60 recipes/100 runs; recipe runs avg/median/p90 3.62/3.00/8.00; manual/auto estimate 3.93/11.80 min.
- B_BALANCED, Floor 2: blacksmith 2.74, alchemist 2.73, jeweler 2.72 resources/run; 29.29 recipes/100 runs; recipe runs avg/median/p90 3.41/2.00/7.00; manual/auto estimate 8.05/24.14 min.
- B_BALANCED, Floor 3: blacksmith 3.46, alchemist 3.58, jeweler 3.56 resources/run; 39.92 recipes/100 runs; recipe runs avg/median/p90 2.51/2.00/5.00; manual/auto estimate 11.96/35.88 min.
- C_3_COMBAT_2_PROF, Floor 1: blacksmith 0.00, alchemist 2.19, jeweler 2.16 resources/run; 17.32 recipes/100 runs; recipe runs avg/median/p90 5.77/4.00/13.00; manual/auto estimate 3.67/11.02 min.
- C_3_COMBAT_2_PROF, Floor 2: blacksmith 0.00, alchemist 2.71, jeweler 2.71 resources/run; 20.13 recipes/100 runs; recipe runs avg/median/p90 4.97/4.00/11.00; manual/auto estimate 7.37/22.10 min.
- C_3_COMBAT_2_PROF, Floor 3: blacksmith 0.00, alchemist 3.48, jeweler 3.49 resources/run; 26.97 recipes/100 runs; recipe runs avg/median/p90 3.71/3.00/8.00; manual/auto estimate 11.24/33.71 min.
- D_DUPLICATE_PROF, Floor 1: blacksmith 2.26, alchemist 2.31, jeweler 0.00 resources/run; 20.45 recipes/100 runs; recipe runs avg/median/p90 4.89/4.00/11.00; manual/auto estimate 3.97/11.92 min.
- D_DUPLICATE_PROF, Floor 2: blacksmith 2.74, alchemist 2.95, jeweler 0.00 resources/run; 21.83 recipes/100 runs; recipe runs avg/median/p90 4.58/3.00/10.00; manual/auto estimate 8.14/24.42 min.
- D_DUPLICATE_PROF, Floor 3: blacksmith 3.50, alchemist 3.70, jeweler 0.00 resources/run; 27.39 recipes/100 runs; recipe runs avg/median/p90 3.65/3.00/8.00; manual/auto estimate 12.08/36.25 min.
- E_3_PLAYERS, Floor 1: blacksmith 0.00, alchemist 1.70, jeweler 0.00 resources/run; 3.83 recipes/100 runs; recipe runs avg/median/p90 26.11/18.00/59.00; manual/auto estimate 4.92/14.75 min.
- E_3_PLAYERS, Floor 2: blacksmith 0.00, alchemist 1.92, jeweler 0.00 resources/run; 3.86 recipes/100 runs; recipe runs avg/median/p90 25.91/18.00/59.00; manual/auto estimate 8.96/26.88 min.
- E_3_PLAYERS, Floor 3: blacksmith 0.00, alchemist 2.48, jeweler 0.00 resources/run; 4.90 recipes/100 runs; recipe runs avg/median/p90 20.41/14.00/46.00; manual/auto estimate 12.34/37.01 min.
- F_4_PLAYERS, Floor 1: blacksmith 0.00, alchemist 1.87, jeweler 1.83 resources/run; 10.26 recipes/100 runs; recipe runs avg/median/p90 9.75/7.00/22.00; manual/auto estimate 4.52/13.55 min.
- F_4_PLAYERS, Floor 2: blacksmith 0.00, alchemist 2.36, jeweler 2.34 resources/run; 11.98 recipes/100 runs; recipe runs avg/median/p90 8.35/6.00/19.00; manual/auto estimate 9.08/27.24 min.
- F_4_PLAYERS, Floor 3: blacksmith 0.00, alchemist 3.07, jeweler 3.00 resources/run; 16.17 recipes/100 runs; recipe runs avg/median/p90 6.18/4.00/14.00; manual/auto estimate 13.07/39.21 min.
- G_5_PLAYERS, Floor 1: blacksmith 2.24, alchemist 2.24, jeweler 2.14 resources/run; 27.99 recipes/100 runs; recipe runs avg/median/p90 3.57/3.00/8.00; manual/auto estimate 3.94/11.82 min.
- G_5_PLAYERS, Floor 2: blacksmith 2.73, alchemist 2.76, jeweler 2.70 resources/run; 29.45 recipes/100 runs; recipe runs avg/median/p90 3.40/2.00/7.00; manual/auto estimate 8.05/24.15 min.
- G_5_PLAYERS, Floor 3: blacksmith 3.48, alchemist 3.56, jeweler 3.54 resources/run; 40.38 recipes/100 runs; recipe runs avg/median/p90 2.48/2.00/5.00; manual/auto estimate 11.96/35.88 min.

## Market sanity (raw production per 100 runs)

- Floor 1: 715.09 resources, 27.60 recipes, 69935.29 coins, 736.84 potions consumed.
- Floor 2: 889.07 resources, 29.29 recipes, 151143.08 coins, 1150.64 potions consumed.
- Floor 3: 1154.76 resources, 39.92 recipes, 334097.78 coins, 1859.89 potions consumed.
