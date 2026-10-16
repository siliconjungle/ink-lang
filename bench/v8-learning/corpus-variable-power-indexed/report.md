# Planning corpus report

Target `javascript`, effort `quick`, compiler `ed3f7238bcae`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 4 |
| With any knowledge-backed alternative | 4 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 23.676000000000002 |
| Laws admitted (in 2+ programs) | 6 (1) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 18 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| ast-ancestor | 19 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| text-lines | 18 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| drawing-hit | 25 | time | 0 | 0 | 0 | 0 | 1 | measurement_evidence |
| particle-step | 44 | time | 4 | 4 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 26 | time | 0 | 0 | 0 | 0 | 1 | measurement_evidence |
| index-membership | 22 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| incremental-distinct | 19 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| bulk-update | 52 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| compact-set | 27 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| proved-observations | 14.56 | 37% |
| all-published-packages | 12.41 | 32% |
| database-source-algorithms | 1.36 | 4% |
| semantic-laws | 1.07 | 3% |
| maintained-folds | 0.95 | 2% |
| scalar-observation-arguments | 0.85 | 2% |
| whole-state-protocols | 0.85 | 2% |
| guarded-parameter-cache | 0.78 | 2% |
| modular-semantic-laws | 0.78 | 2% |
| source-capabilities | 0.76 | 2% |
| pure-routing | 0.72 | 2% |
| boundary-readers | 0.19 | 0% |
| private-sum-spines | 0.15 | 0% |
| private-record-elision | 0.15 | 0% |
| proved-capacities | 0.13 | 0% |

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
