# Structured preparation measurements

Held-out process medians on Node 25.3.0 / Apple M4 Pro: neural prediction 39.059 → 11.325 µs (3.45×). The separate dense kernel is 0.363 µs and omits state/ABI costs.

| Rows | Observation | Direct µs | Retained µs | Direct / retained |
| --- | --- | ---: | ---: | ---: |
| 0 | names | 0.226 | 0.122 | 1.85× |
| 0 | value | 0.261 | 0.106 | 2.46× |
| 1 | names | 0.834 | 0.217 | 3.84× |
| 1 | value | 2.687 | 1.951 | 1.38× |
| 128 | names | 18.703 | 6.467 | 2.89× |
| 128 | value | 142.986 | 129.133 | 1.11× |
| 4096 | names | 637.935 | 210.190 | 3.04× |
| 4096 | value | 5325.583 | 5243.000 | 1.02× |

| Reads per table update | Direct µs/turn | Retained µs/turn | Direct / retained |
| --- | ---: | ---: | ---: |
| 0 | 9.312 | 9.895 | 0.94× |
| 1 | 31.751 | 65.104 | 0.49× |
| 16 | 325.854 | 175.604 | 1.86× |

| Predictions per training turn | Direct µs/turn | Retained µs/turn | Direct / retained |
| --- | ---: | ---: | ---: |
| 0 | 310.932 | 386.167 | 0.81× |
| 4 | 598.068 | 473.781 | 1.26× |
| 16 | 1510.677 | 730.130 | 2.07× |

Ratios below one are regressions. One training turn has two Adam updates, with one rolled-back frame per four turns. Timed calls consume their complete outputs; checkpoint comparison and persistence are outside timing.

The 4096-row first names read is 0.704 → 1.770 ms. Private-cache startup and retained-memory costs remain visible.
