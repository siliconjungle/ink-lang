# Planning corpus report

Target `javascript`, effort `quick`, compiler `ed3f7238bcae`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 2 |
| With any knowledge-backed alternative | 2 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 25.503500000000003 |
| Laws admitted (in 2+ programs) | 5 (0) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 27 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| ast-ancestor | 23 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| text-lines | 23 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| drawing-hit | 27 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| particle-step | 31 | time | 2 | 2 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 24 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| index-membership | 24 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| incremental-distinct | 20 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| bulk-update | 54 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| compact-set | 30 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 37.35 | 82% |
| proved-observations | 3.2 | 7% |
| database-source-algorithms | 1.31 | 3% |
| semantic-laws | 1.14 | 2% |
| maintained-folds | 1.03 | 2% |
| modular-semantic-laws | 0.85 | 2% |
| index | 0.1 | 0% |
| guarded-parameter-cache | 0.08 | 0% |
| whole-action-coalescing | 0.08 | 0% |
| grouped-index | 0.08 | 0% |
| pure-routing | 0.08 | 0% |
| whole-entry-placement | 0.08 | 0% |
| source-capabilities | 0.08 | 0% |
| whole-state-protocols | 0.08 | 0% |
| frame-projection | 0.07 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 0ed2e74a78dff510 | law | particle-step |
| 7069b2b125e492c9 | law | bulk-update |
| 8c2dc4e9d4ed881c | law | bulk-update |
| 8e2c50472eec5ace | law | bulk-update |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
