# Planning corpus report

Target `javascript`, effort `quick`, compiler `b3940bc06a81`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 9 |
| With any knowledge-backed alternative | 9 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 45.8285 |
| Laws admitted (in 2+ programs) | 23 (5) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 42 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| ast-ancestor | 47 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| text-lines | 45 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| drawing-hit | 53 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| particle-step | 42 | time | 2 | 2 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 55 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| index-membership | 72 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| incremental-distinct | 43 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| bulk-update | 49 | time | 0 | 0 | 0 | 0 | 8 | measurement_evidence |
| compact-set | 37 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 48.29 | 69% |
| proved-observations | 11.67 | 17% |
| database-source-algorithms | 1.56 | 2% |
| maintained-folds | 1.17 | 2% |
| semantic-laws | 0.82 | 1% |
| modular-semantic-laws | 0.76 | 1% |
| pure-routing | 0.74 | 1% |
| source-capabilities | 0.74 | 1% |
| whole-state-protocols | 0.56 | 1% |
| guarded-parameter-cache | 0.37 | 0% |
| scalar-observation-arguments | 0.35 | 0% |
| boundary-readers | 0.13 | 0% |
| index | 0.11 | 0% |
| guarded-whole-call-2048 | 0.1 | 0% |
| proved-scalar-observation-hoists | 0.1 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, drawing-hit, incremental-distinct, index-membership, sequence-every, spatial-collision, text-lines |
| sets.indexed-construction.u32.word_equal_symmetric | law | ast-ancestor, index-membership, text-lines |
| 8c2dc4e9d4ed881c | law | bulk-update, incremental-distinct, text-lines |
| b25eacd1251bfc29 | law | drawing-hit, index-membership, spatial-collision |
| 7990f49602301b4c | law | drawing-hit, spatial-collision |
| 03db601184a24ab1 | law | drawing-hit |
| 0ed2e74a78dff510 | law | particle-step |
| 328a77c62a310366 | law | sequence-every |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 4d8433ee77b0d2e1 | law | index-membership |
| 67945ed9ba849de3 | law | sequence-every |
| 6830ed35ef507665 | law | ast-ancestor |
| 73a2a5e50087631b | law | sequence-every |
| 84ebd27c020770e9 | law | index-membership |
| 8aadb841ec7a269e | law | sequence-every |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| a9cd775b6b2b9912 | law | index-membership |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
