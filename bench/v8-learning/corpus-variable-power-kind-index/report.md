# Planning corpus report

Target `javascript`, effort `quick`, compiler `ed3f7238bcae`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 4 |
| With any knowledge-backed alternative | 4 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 23.3115 |
| Laws admitted (in 2+ programs) | 6 (1) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 19 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| ast-ancestor | 20 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| text-lines | 18 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| drawing-hit | 25 | time | 0 | 0 | 0 | 0 | 1 | measurement_evidence |
| particle-step | 46 | time | 10 | 10 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 26 | time | 0 | 0 | 0 | 0 | 1 | measurement_evidence |
| index-membership | 22 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| incremental-distinct | 19 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| bulk-update | 52 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| compact-set | 29 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| proved-observations | 18.53 | 46% |
| contextual-properties | 4.2 | 10% |
| maintained-folds | 2.32 | 6% |
| database-source-algorithms | 1.39 | 4% |
| whole-state-protocols | 1.34 | 3% |
| all-published-packages | 1.28 | 3% |
| pure-routing | 1.13 | 3% |
| semantic-laws | 1.1 | 3% |
| scalar-observation-arguments | 0.95 | 2% |
| source-capabilities | 0.82 | 2% |
| modular-semantic-laws | 0.8 | 2% |
| guarded-parameter-cache | 0.78 | 2% |
| boundary-readers | 0.4 | 1% |
| proved-capacities | 0.36 | 1% |
| private-sum-spines | 0.33 | 1% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 5a0cf328fbe55589 | law | drawing-hit, spatial-collision |
| 0ed2e74a78dff510 | law | particle-step |
| 7069b2b125e492c9 | law | bulk-update |
| 8c2dc4e9d4ed881c | law | bulk-update |
| 8e2c50472eec5ace | law | bulk-update |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
