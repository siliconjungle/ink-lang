# Planning corpus report

Target `javascript`, effort `quick`, compiler `3e59f720264e`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 10 |
| With any knowledge-backed alternative | 10 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 45.2385 |
| Laws admitted (in 2+ programs) | 25 (6) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 44 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| ast-ancestor | 46 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| text-lines | 45 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| drawing-hit | 49 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| particle-step | 40 | time | 2 | 2 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 51 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| index-membership | 73 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| incremental-distinct | 42 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| bulk-update | 44 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| compact-set | 77 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 41.58 | 61% |
| proved-observations | 11.34 | 17% |
| contextual-properties | 3.36 | 5% |
| database-source-algorithms | 1.09 | 2% |
| maintained-folds | 1.05 | 2% |
| scalar-observation-arguments | 0.91 | 1% |
| source-capabilities | 0.88 | 1% |
| whole-state-protocols | 0.87 | 1% |
| guarded-parameter-cache | 0.85 | 1% |
| pure-routing | 0.83 | 1% |
| semantic-laws | 0.76 | 1% |
| modular-semantic-laws | 0.67 | 1% |
| boundary-readers | 0.12 | 0% |
| index | 0.1 | 0% |
| representation-13 | 0.1 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, drawing-hit, incremental-distinct, index-membership, sequence-every, spatial-collision, text-lines |
| sets.indexed-construction.u32.word_equal_symmetric | law | ast-ancestor, compact-set, index-membership, text-lines |
| b25eacd1251bfc29 | law | compact-set, drawing-hit, index-membership, spatial-collision |
| 8c2dc4e9d4ed881c | law | bulk-update, incremental-distinct, text-lines |
| 5a0cf328fbe55589 | law | drawing-hit, spatial-collision |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 0cfd6e87c2f104eb | law | compact-set |
| 0ed2e74a78dff510 | law | particle-step |
| 2b207c2185c96fe0 | law | compact-set |
| 328a77c62a310366 | law | sequence-every |
| 3c00e05bc235bdba | law | index-membership |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 62d920d8294405dc | law | spatial-collision |
| 67945ed9ba849de3 | law | sequence-every |
| 6830ed35ef507665 | law | ast-ancestor |
| 73a2a5e50087631b | law | sequence-every |
| 8aadb841ec7a269e | law | sequence-every |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
