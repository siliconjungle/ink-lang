# Planning corpus report

Target `javascript`, effort `balanced`, compiler `50529d6b4e8a`, knowledge snapshot `3a82f649394a`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 8 |
| With any knowledge-backed alternative | 10 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 8 |
| Median planning seconds | 76.128 |
| Laws admitted (in 2+ programs) | 17 (2) |
| Representations admitted | 19 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| ast-ancestor | 76 | time | 14 | 4 | 10 | 0 | 2 | measurement_evidence |
| text-lines | 77 | time | 6 | 0 | 6 | 0 | 0 | measurement_evidence |
| drawing-hit | 77 | time | 34 | 15 | 8 | 0 | 51 | measurement_evidence |
| particle-step | 76 | time | 2 | 2 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 77 | time | 6 | 6 | 0 | 0 | 58 | measurement_evidence |
| index-membership | 77 | time | 14 | 10 | 0 | 0 | 5 | measurement_evidence |
| incremental-distinct | 61 | states | 2 | 0 | 2 | 0 | 0 | measurement_evidence |
| bulk-update | 76 | time | 14 | 2 | 12 | 0 | 1 | measurement_evidence |
| compact-set | 63 | states | 40 | 11 | 24 | 0 | 11 | measurement_evidence |
| sequence-every | 76 | time | 2 | 2 | 0 | 0 | 1 | measurement_evidence |

## Near misses

Checker rejection gates: premise 60, closure 2

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:False` | 27 | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, text-lines |
| `_ = Bool:True` | 27 | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, text-lines |
| `binary:==(_, Word:0) = Bool:True` | 6 | bulk-update, text-lines |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 54.36 | 24% |
| contextual-properties | 52.82 | 23% |
| all-published-packages | 36.65 | 16% |
| proved-observations | 14.02 | 6% |
| representation-products | 7.48 | 3% |
| migration-bridges | 4.36 | 2% |
| packed-rows | 2.87 | 1% |
| literal-physical-alternatives | 2.62 | 1% |
| representation-18 | 2.6 | 1% |
| representation-12 | 2.44 | 1% |
| representation-14 | 2.4 | 1% |
| direct | 2.33 | 1% |
| representation-13 | 2.23 | 1% |
| proved-capacities | 2.19 | 1% |
| representation-15 | 2.12 | 1% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 022094aace906ec4 | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 67e777b69d9cb66b | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 7ce7094b679787ee | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 8132e6b162471821 | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| a56185203d464f0b | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| a8297d15cb5a43be | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| b64825cf1639173f | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| b74959e565d70408 | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| b9a169f0289d0497 | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| d24cc067018ed26c | representation | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 29a9115cf0b69c46 | representation | ast-ancestor, bulk-update, drawing-hit, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 39973054b24f148a | representation | ast-ancestor, bulk-update, drawing-hit, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 48067ed0f81f081a | representation | ast-ancestor, bulk-update, drawing-hit, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 670ff943ea75a3d8 | representation | ast-ancestor, bulk-update, drawing-hit, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 8e8a764af9cb5086 | representation | ast-ancestor, bulk-update, drawing-hit, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| c3d03d9fa5bef353 | representation | ast-ancestor, bulk-update, drawing-hit, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| f2da814eaa2ef2fc | representation | ast-ancestor, bulk-update, drawing-hit, index-membership, particle-step, sequence-every, spatial-collision, text-lines |
| 526b20613fd27b39 | representation | drawing-hit, incremental-distinct, text-lines |
| 5217f0c0bbcf5009 | representation | drawing-hit, text-lines |
| 7990f49602301b4c | law | drawing-hit, spatial-collision |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 0ed2e74a78dff510 | law | particle-step |
| 328a77c62a310366 | law | sequence-every |
| 3560f23cc75d5666 | law | drawing-hit |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 6379fbdcbbf46bc3 | law | spatial-collision |
| 84ebd27c020770e9 | law | index-membership |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| aee4207523acc7ac | law | compact-set |
| b0de50753ae48f24 | law | ast-ancestor |
| c194e5ffa5252e0e | law | spatial-collision |
| c4592c7e11c18584 | law | compact-set |
| d772b42ab196c507 | law | ast-ancestor |
| fca76009acdf8700 | law | drawing-hit |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
