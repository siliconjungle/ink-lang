# Planning corpus report

Target `javascript`, effort `quick`, compiler `997800fa1dd0`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 10 |
| With any knowledge-backed alternative | 10 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 51.3865 |
| Laws admitted (in 2+ programs) | 24 (6) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 48 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| ast-ancestor | 48 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| text-lines | 45 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| drawing-hit | 57 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| particle-step | 29 | time | 2 | 2 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 58 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| index-membership | 75 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| incremental-distinct | 47 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| bulk-update | 54 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| compact-set | 83 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 51.23 | 87% |
| proved-observations | 1.81 | 3% |
| database-source-algorithms | 1.43 | 2% |
| semantic-laws | 1.06 | 2% |
| maintained-folds | 1.04 | 2% |
| modular-semantic-laws | 0.76 | 1% |
| pure-routing | 0.15 | 0% |
| source-capabilities | 0.15 | 0% |
| index | 0.09 | 0% |
| guarded-whole-call-2048 | 0.09 | 0% |
| small-carrier-inline | 0.09 | 0% |
| private-sum-spines | 0.08 | 0% |
| scalar-observation-arguments | 0.08 | 0% |
| proved-capacities | 0.08 | 0% |
| whole-state-protocols | 0.08 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, drawing-hit, incremental-distinct, index-membership, sequence-every, spatial-collision, text-lines |
| sets.indexed-construction.u32.word_equal_symmetric | law | ast-ancestor, compact-set, index-membership, text-lines |
| b25eacd1251bfc29 | law | compact-set, drawing-hit, index-membership, spatial-collision |
| 8c2dc4e9d4ed881c | law | bulk-update, incremental-distinct, text-lines |
| 7990f49602301b4c | law | drawing-hit, spatial-collision |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 0ed2e74a78dff510 | law | particle-step |
| 2b207c2185c96fe0 | law | compact-set |
| 328a77c62a310366 | law | sequence-every |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 67945ed9ba849de3 | law | sequence-every |
| 6830ed35ef507665 | law | ast-ancestor |
| 6da09dd3640fe64e | law | compact-set |
| 73a2a5e50087631b | law | sequence-every |
| 84ebd27c020770e9 | law | index-membership |
| 8aadb841ec7a269e | law | sequence-every |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
