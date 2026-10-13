# Planning corpus report

Target `javascript`, effort `balanced`, compiler `50529d6b4e8a`, knowledge snapshot `c19eefbd9f63`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 8 |
| With any knowledge-backed alternative | 10 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 8 |
| Median planning seconds | 76.72 |
| Laws admitted (in 2+ programs) | 24 (3) |
| Representations admitted | 19 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 77 | time | 4 | 4 | 0 | 0 | 2 | measurement_evidence |
| ast-ancestor | 77 | time | 18 | 6 | 12 | 0 | 3 | measurement_evidence |
| text-lines | 77 | time | 6 | 0 | 6 | 0 | 0 | measurement_evidence |
| drawing-hit | 78 | time | 45 | 21 | 12 | 0 | 56 | measurement_evidence |
| particle-step | 77 | time | 2 | 2 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 78 | time | 11 | 11 | 0 | 0 | 80 | measurement_evidence |
| index-membership | 78 | time | 34 | 22 | 0 | 0 | 11 | measurement_evidence |
| incremental-distinct | 60 | states | 2 | 0 | 2 | 0 | 0 | measurement_evidence |
| bulk-update | 77 | time | 14 | 2 | 12 | 0 | 1 | measurement_evidence |
| compact-set | 63 | states | 85 | 23 | 48 | 0 | 23 | measurement_evidence |

## Near misses

Checker rejection gates: premise 92

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:False` | 43 | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, text-lines |
| `_ = Bool:True` | 43 | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, text-lines |
| `binary:==(_, Word:0) = Bool:True` | 6 | bulk-update, text-lines |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:==(call:fold_until(bound, Bool:False, fn.fn, fn.fn), Bool:False) = Bool:False` | 6 | compact-set |
| `binary:==(call:fold_until(bound, Bool:False, fn.fn, fn.fn), Bool:False) = Bool:True` | 6 | compact-set |
| `binary:==(call:fold_until(field:out(bound), Bool:False, fn.fn, fn.fn), Bool:False) = Bool:False` | 6 | compact-set |
| `binary:==(call:fold_until(field:out(bound), Bool:False, fn.fn, fn.fn), Bool:False) = Bool:True` | 6 | compact-set |
| `binary:==(field:key(bound), free) = Bool:False` | 4 | ast-ancestor |
| `binary:==(field:key(bound), free) = Bool:True` | 4 | ast-ancestor |
| `apply(fn.binary:>=(field:minX(..), Word:16), bound) = Bool:False` | 4 | drawing-hit |
| `apply(fn.binary:>=(field:minX(..), Word:16), bound) = Bool:True` | 4 | drawing-hit |
| `binary:==(free, Word:0) = Bool:True` | 4 | bulk-update |
| `field:active(bound) = Bool:False` | 4 | bulk-update |
| `field:active(bound) = Bool:True` | 4 | bulk-update |
| `binary:==(call:contains(bound, bound), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:contains(bound, bound), Bool:False) = Bool:True` | 3 | compact-set |
| `binary:==(call:contains(field:out(bound), bound), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:contains(field:out(bound), bound), Bool:False) = Bool:True` | 3 | compact-set |
| `binary:==(call:foldl(bound, Bool:False, fn.fn), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:foldl(bound, Bool:False, fn.fn), Bool:False) = Bool:True` | 3 | compact-set |
| `binary:==(call:foldl(field:out(bound), Bool:False, fn.fn), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:foldl(field:out(bound), Bool:False, fn.fn), Bool:False) = Bool:True` | 3 | compact-set |
| `apply(fn.binary:==(field:key(..), free), bound) = Bool:False` | 2 | ast-ancestor |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 65.83 | 29% |
| contextual-properties | 62.25 | 27% |
| proved-observations | 15.46 | 7% |
| representation-products | 7.5 | 3% |
| migration-bridges | 4.08 | 2% |
| packed-rows | 3.36 | 2% |
| representation-18 | 3.19 | 1% |
| representation-12 | 2.98 | 1% |
| literal-physical-alternatives | 2.87 | 1% |
| direct | 2.86 | 1% |
| representation-14 | 2.65 | 1% |
| proved-capacities | 2.43 | 1% |
| index | 2.39 | 1% |
| representation-15 | 2.38 | 1% |
| representation-13 | 2.22 | 1% |

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
| 4d8433ee77b0d2e1 | law | compact-set, index-membership |
| 5217f0c0bbcf5009 | representation | drawing-hit, text-lines |
| 7990f49602301b4c | law | drawing-hit, spatial-collision |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 0ed2e74a78dff510 | law | particle-step |
| 2bddd185d77fb762 | law | spatial-collision |
| 328a77c62a310366 | law | sequence-every |
| 33cd2e0a063a107b | law | drawing-hit |
| 3560f23cc75d5666 | law | drawing-hit |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 5a779aaa61aae7dc | law | spatial-collision |
| 6379fbdcbbf46bc3 | law | spatial-collision |
| 73a2a5e50087631b | law | sequence-every |
| 84ebd27c020770e9 | law | index-membership |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| aee4207523acc7ac | law | compact-set |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| c194e5ffa5252e0e | law | spatial-collision |
| c4592c7e11c18584 | law | compact-set |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
