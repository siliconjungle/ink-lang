# Planning corpus report

Target `javascript`, effort `quick`, compiler `3af77c1db865`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 8 / 10 |
| With an admitted rewrite alternative | 8 |
| With any knowledge-backed alternative | 8 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 8 |
| Median planning seconds | 44.80500000000001 |
| Laws admitted (in 2+ programs) | 21 (5) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 41 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| ast-ancestor | 46 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| text-lines | 41 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| drawing-hit | 49 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| particle-step | 40 | time | 4 | 4 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 50 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| index-membership | failed | | | | | | |  |
| incremental-distinct | 43 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| bulk-update | 48 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| compact-set | failed | | | | | | |  |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 32.31 | 60% |
| proved-observations | 7.61 | 14% |
| contextual-properties | 3.23 | 6% |
| database-source-algorithms | 0.85 | 2% |
| maintained-folds | 0.82 | 2% |
| semantic-laws | 0.74 | 1% |
| scalar-observation-arguments | 0.74 | 1% |
| whole-state-protocols | 0.72 | 1% |
| guarded-parameter-cache | 0.68 | 1% |
| modular-semantic-laws | 0.68 | 1% |
| source-capabilities | 0.67 | 1% |
| pure-routing | 0.62 | 1% |
| private-sum-spines | 0.17 | 0% |
| proved-capacities | 0.15 | 0% |
| boundary-readers | 0.12 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, drawing-hit, incremental-distinct, sequence-every, spatial-collision, text-lines |
| 8c2dc4e9d4ed881c | law | bulk-update, incremental-distinct, text-lines |
| sets.indexed-construction.u32.word_equal_symmetric | law | ast-ancestor, text-lines |
| 5a0cf328fbe55589 | law | drawing-hit, spatial-collision |
| b25eacd1251bfc29 | law | drawing-hit, spatial-collision |
| 03db601184a24ab1 | law | drawing-hit |
| 0ed2e74a78dff510 | law | particle-step |
| 328a77c62a310366 | law | sequence-every |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 67945ed9ba849de3 | law | sequence-every |
| 6830ed35ef507665 | law | ast-ancestor |
| 73a2a5e50087631b | law | sequence-every |
| 7990f49602301b4c | law | spatial-collision |
| 8aadb841ec7a269e | law | sequence-every |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
