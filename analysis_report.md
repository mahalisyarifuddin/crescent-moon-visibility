# Tabular Algorithm Optimization Analysis

## Objective
Find the best fitting formula for the Tabular Islamic Calendar coefficient `C` to approximate the MABBIMS visibility criteria for the period 1000-2000 AH.
The analysis was performed in two phases:
1.  **Phase 1:** Obligatory months only (Ramadan, Shawwal, Dhu al-Hijjah).
2.  **Phase 2:** All 12 Hijri months.

## Methodology
- **Locations:** Dakar (-17.4677), Mecca (39.8579), Banda Aceh (95.1125).
- **Ground Truth:** Calculated using `astronomy-engine` with MABBIMS criteria (Alt >= 3°, Elong >= 6.4°, Age >= 0, calculated at local sunset).
- **Tabular Algorithm:** Kuwaiti algorithm with variable shift `C`. Formula: `floor((11*H + C)/30)`.
- **Optimization:** Tested `C` values from -15 to 30.

## Results

### Phase 1: Obligatory Months (9, 10, 12)

| Location   | Longitude | Best C | Accuracy |
|------------|-----------|--------|----------|
| Dakar      | -17.47°   | 12     | 65.60%   |
| Mecca      | 39.86°    | 18     | 66.07%   |
| Banda Aceh | 95.11°    | 22     | 65.27%   |

*Derived Formula (Phase 1):* `C = Math.round(lon / 11.25 + 14)`

### Phase 2: All Months (1-12)

| Location   | Longitude | Best C | Accuracy | Current Formula `round(lon/12 + 7.5)` | New Regression `round(lon/12.5 + 7.8)` |
|------------|-----------|--------|----------|---------------------------------------|----------------------------------------|
| Dakar      | -17.47°   | 6      | 64.65%   | 6                                     | 6                                      |
| Mecca      | 39.86°    | 12     | 64.55%   | 11                                    | 11                                     |
| Banda Aceh | 95.11°    | 15     | 64.29%   | 15                                    | 15                                     |

*Derived Formula (Phase 2):* `C = Math.round(lon / 12.5 + 7.8)`

## Analysis
When considering **all months**, the optimal `C` values are significantly lower.
A linear regression on the best C values (6, 12, 15) yields:
- Slope: ~0.08 (1/12.5)
- Intercept: ~7.86

The new formula `round(lon / 12.5 + 7.8)` predicts:
- Dakar: `round(-1.4 + 7.8) = 6` (Matches)
- Mecca: `round(3.2 + 7.8) = 11` (Still misses 12, but closer)
- Banda Aceh: `round(7.6 + 7.8) = 15` (Matches)

The existing formula `round(lon/12 + 7.5)` performs identically to the new regression for these points (6, 11, 15). Given the simplicity and history, `round(lon/12 + 7.5)` is acceptable, but for the sake of "better regression fit" requested, we will use the slightly tuned parameters: **`round(lon / 12.5 + 7.8)`**.
