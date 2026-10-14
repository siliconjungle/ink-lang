# Planning corpus report

Target `javascript`, effort `balanced`, compiler `7d11267dd040`, knowledge snapshot `46dcbc6df471`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 10 |
| With any knowledge-backed alternative | 10 |
| Selecting an alternative under defaults | 2 |
| Stopped by the time budget | 6 |
| Median planning seconds | 87.194 |
| Laws admitted (in 2+ programs) | 35 (6) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 83 | states | 9218 | 297 | 772 | 7970 | 481 | measurement_budget |
| ast-ancestor | 91 | time | 6741 | 229 | 735 | 5675 | 432 | measurement_budget |
| text-lines | 89 | time | 8142 | 272 | 182 | 7594 | 391 | measurement_budget |
| drawing-hit | 96 | time | 11245 | 144 | 400 | 10616 | 258 | measurement_budget |
| particle-step | 45 | fixed-point | 5 | 5 | 0 | 0 | 5 | selected_alternative |
| spatial-collision | 97 | time | 12342 | 176 | 232 | 11881 | 319 | measurement_budget |
| index-membership | 84 | time | 18363 | 204 | 404 | 17676 | 406 | selected_alternative |
| incremental-distinct | 62 | states | 7627 | 277 | 1039 | 6101 | 277 | measurement_budget |
| bulk-update | 86 | time | 8002 | 281 | 611 | 6997 | 445 | measurement_budget |
| compact-set | 100 | states | 15628 | 144 | 280 | 15117 | 144 | measurement_budget |

## Near misses

Checker rejection gates: premise 2527, closure 2127, other 1

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:False` | 1166 | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, spatial-collision, text-lines |
| `_ = Bool:True` | 837 | ast-ancestor, bulk-update, compact-set, incremental-distinct, sequence-every, text-lines |
| `binary:==(_, Word:0) = Bool:True` | 180 | bulk-update, text-lines |
| `_ = Nil` | 150 | compact-set |
| `binary:||(binary:==(field:seen(..), Bool:False), binary:!=(field:last(..), _)) = Bool:Fals` | 56 | incremental-distinct |
| `binary:||(binary:==(field:seen(..), Bool:False), binary:!=(field:last(..), _)) = Bool:True` | 48 | incremental-distinct |
| `binary:==(field:key(_), _) = Bool:False` | 35 | ast-ancestor |
| `binary:==(field:key(_), _) = Bool:True` | 19 | ast-ancestor |
| `binary:<(_, _) = Bool:True` | 12 | sequence-every |
| `binary:==(field:seen(_), Bool:False) = Bool:False` | 6 | incremental-distinct |
| `field:active(_) = Bool:False` | 3 | bulk-update |
| `field:active(_) = Bool:True` | 3 | bulk-update |
| `binary:&&(binary:&&(binary:<=(..), binary:<=(..)), binary:>=(field:maxX(..), field:minX(..` | 2 | drawing-hit, spatial-collision |
| `binary:&&(binary:<=(field:minX(..), field:maxX(..)), binary:<=(field:minY(..), field:maxY(` | 2 | drawing-hit, spatial-collision |
| `binary:<=(field:minX(_), field:maxX(_)) = Bool:True` | 2 | drawing-hit, spatial-collision |
| `binary:==(_, Word:10) = Bool:True` | 1 | text-lines |
| `binary:==(_, Word:13) = Bool:False` | 1 | text-lines |
| `binary:||(binary:==(_, Word:13), binary:&&(binary:==(..), binary:!=(..))) = Bool:False` | 1 | text-lines |
| `binary:||(binary:==(_, Word:13), binary:&&(binary:==(..), binary:!=(..))) = Bool:True` | 1 | text-lines |
| `binary:==(call:contains(_, _), Bool:False) = Bool:False` | 1 | compact-set |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:False` | 174 | incremental-distinct |
| `call:foldl(free, Bool:False, fn.fn.binary:||(..)) = Bool:False` | 152 | compact-set, index-membership, spatial-collision |
| `call:foldl(free, Bool:True, fn.fn.binary:&&(..)) = Bool:True` | 150 | sequence-every |
| `call:foldl(free, Bool:False, fn.fn.call:choose(..)) = Bool:False` | 126 | drawing-hit, index-membership, spatial-collision |
| `field:active(bound) = Bool:False` | 111 | bulk-update |
| `field:out(call:foldl(free, record:__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_` | 109 | compact-set |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), call:choose(binary:>(..), bou` | 91 | incremental-distinct |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), call:choose(binary:>(..), bou` | 75 | incremental-distinct |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:True` | 66 | incremental-distinct |
| `binary:==(call:choose(binary:||(binary:==(..), binary:&&(..)), Word:1, Word:0), Word:0) = Bool:True` | 53 | text-lines |
| `binary:==(field:key(bound), call:choose(binary:>(free, call:choose(..)), free, free)) = Bool:False` | 48 | ast-ancestor |
| `binary:==(field:active(bound), Bool:False) = Bool:True` | 46 | bulk-update |
| `call:foldl(free, call:choose(Bool:False, Bool:False, Bool:False), fn.fn.binary:||(..)) = Bool:False` | 44 | index-membership, spatial-collision |
| `call:foldl(free, call:choose(Bool:True, Bool:True, Bool:True), fn.fn.binary:&&(..)) = Bool:True` | 36 | sequence-every |
| `binary:==(field:key(bound), call:choose(binary:>(free, call:choose(..)), free, free)) = Bool:True` | 33 | ast-ancestor |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(call:choose(binary:>(..), field:last(..), field:` | 25 | incremental-distinct |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(call:choose(binary:>(..), field:last(..), field:` | 25 | incremental-distinct |
| `call:fold_until(free, Bool:True, fn.fn.call:choose(..), fn.fn.binary:&&(..)) = Bool:True` | 24 | sequence-every |
| `call:choose(apply(fn.binary:>=(..), bound), apply(apply(fn, apply(..)), bound), bound) = Bool:False` | 22 | drawing-hit |
| `call:fold_until(free, Bool:False, fn.fn.bound, fn.fn.binary:||(..)) = Bool:False` | 22 | index-membership, spatial-collision |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 312.84 | 56% |
| contextual-properties | 54.72 | 10% |
| all-published-packages | 41.77 | 8% |
| proved-observations | 17.16 | 3% |
| maintained-folds | 15.86 | 3% |
| boundary-readers | 7.01 | 1% |
| representation-18 | 6.37 | 1% |
| packed-rows | 5.26 | 1% |
| representation-14 | 3.95 | 1% |
| direct | 3.73 | 1% |
| representation-13 | 3.64 | 1% |
| representation-12 | 3.52 | 1% |
| representation-15 | 3.51 | 1% |
| private-record-elision | 3.3 | 1% |
| representation-16 | 3.23 | 1% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, sequence-every, spatial-collision, text-lines |
| b25eacd1251bfc29 | law | compact-set, drawing-hit, index-membership, spatial-collision |
| 4d8433ee77b0d2e1 | law | compact-set, index-membership |
| 7990f49602301b4c | law | drawing-hit, spatial-collision |
| 8c2dc4e9d4ed881c | law | bulk-update, text-lines |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 0bdbe209d080be90 | law | drawing-hit |
| 0ed2e74a78dff510 | law | particle-step |
| 1c8d58e0d65c5f8d | law | index-membership |
| 328a77c62a310366 | law | sequence-every |
| 3560f23cc75d5666 | law | drawing-hit |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 6379fbdcbbf46bc3 | law | spatial-collision |
| 67945ed9ba849de3 | law | sequence-every |
| 73a2a5e50087631b | law | sequence-every |
| 84ebd27c020770e9 | law | index-membership |
| 85e3e0c622235b10 | law | text-lines |
| 8aadb841ec7a269e | law | sequence-every |
| 8ab3dcac674e160a | law | sequence-every |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| aee4207523acc7ac | law | compact-set |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| b912e8d070f87a10 | law | text-lines |
| c194e5ffa5252e0e | law | spatial-collision |
| c4592c7e11c18584 | law | compact-set |
| d21137960295c1ec | law | bulk-update |
| d37e8c21ee1f0ddb | law | sequence-every |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |
| fc6cb9bcda4bbdd3 | law | index-membership |
| fca76009acdf8700 | law | drawing-hit |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
