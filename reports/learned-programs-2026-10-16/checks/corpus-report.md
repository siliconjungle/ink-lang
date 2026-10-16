# Planning corpus report

Target `rust`, effort `balanced`, compiler `004898faeb2a`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 10 |
| With any knowledge-backed alternative | 10 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 9 |
| Median planning seconds | 93.197 |
| Laws admitted (in 2+ programs) | 54 (7) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 92 | time | 10690 | 306 | 222 | 10042 | 19 | measurement_budget |
| ast-ancestor | 90 | time | 5594 | 341 | 265 | 4896 | 29 | measurement_budget |
| text-lines | 90 | time | 10626 | 320 | 240 | 9904 | 39 | measurement_budget |
| drawing-hit | 96 | time | 16929 | 254 | 317 | 16301 | 26 | measurement_budget |
| particle-step | 55 | fixed-point | 20 | 20 | 0 | 0 | 8 | measurement_budget |
| spatial-collision | 98 | time | 18057 | 247 | 304 | 17441 | 22 | measurement_budget |
| index-membership | 100 | time | 22347 | 298 | 311 | 21626 | 23 | measurement_budget |
| incremental-distinct | 92 | time | 15210 | 660 | 496 | 13806 | 11 | measurement_budget |
| bulk-update | 94 | time | 9738 | 338 | 494 | 8724 | 29 | measurement_budget |
| compact-set | 108 | time | 20773 | 225 | 350 | 20026 | 24 | measurement_budget |

## Near misses

Checker rejection gates: premise 2198, closure 795, other 6

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:False` | 1325 | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, spatial-collision, text-lines |
| `_ = Bool:True` | 355 | ast-ancestor, bulk-update, compact-set, incremental-distinct, sequence-every, text-lines |
| `binary:==(_, Word:0) = Bool:True` | 238 | bulk-update, text-lines |
| `_ = Nil` | 122 | compact-set |
| `field:active(_) = Bool:False` | 66 | bulk-update |
| `binary:||(binary:==(field:seen(..), Bool:False), binary:!=(field:last(..), _)) = Bool:Fals` | 20 | incremental-distinct |
| `field:active(_) = Bool:True` | 16 | bulk-update |
| `binary:||(binary:==(field:seen(..), Bool:False), binary:!=(field:last(..), _)) = Bool:True` | 12 | incremental-distinct |
| `call:word_and(_, _) = Word:0` | 8 | bulk-update, text-lines |
| `binary:&&(binary:&&(binary:<=(..), binary:<=(..)), binary:>=(field:maxX(..), field:minX(..` | 4 | drawing-hit, spatial-collision |
| `binary:&&(binary:<=(field:minX(..), field:maxX(..)), binary:<=(field:minY(..), field:maxY(` | 4 | drawing-hit, spatial-collision |
| `binary:<=(field:minX(_), field:maxX(_)) = Bool:True` | 4 | drawing-hit, spatial-collision |
| `binary:==(field:seen(_), Bool:False) = Bool:False` | 4 | incremental-distinct |
| `binary:||(_, _) = Bool:True` | 4 | bulk-update |
| `binary:<(_, _) = Bool:True` | 2 | sequence-every |
| `binary:==(field:key(_), _) = Bool:False` | 2 | ast-ancestor |
| `binary:==(field:key(_), _) = Bool:True` | 2 | ast-ancestor |
| `binary:==(_, Word:10) = Bool:True` | 2 | text-lines |
| `binary:==(_, Word:13) = Bool:False` | 2 | text-lines |
| `binary:||(binary:==(_, Word:13), binary:&&(binary:==(..), binary:!=(..))) = Bool:False` | 2 | text-lines |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:False` | 412 | incremental-distinct |
| `binary:==(call:choose(binary:||(binary:==(..), binary:&&(..)), Word:1, Word:0), Word:0) = Bool:True` | 212 | text-lines |
| `field:active(bound) = Bool:False` | 154 | bulk-update |
| `binary:==(field:key(bound), free) = Bool:False` | 95 | ast-ancestor |
| `binary:==(free, field:key(bound)) = Bool:False` | 94 | ast-ancestor |
| `call:foldl(free, Bool:False, fn.fn.binary:||(..)) = Bool:False` | 75 | compact-set, index-membership, spatial-collision |
| `field:out(call:foldl(free, record:__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_` | 53 | compact-set |
| `field:active(bound) = Bool:True` | 48 | bulk-update |
| `call:foldl(free, call:choose(Bool:True, Bool:True, call:choose(call:choose(..), Bool:True, call:choose(..))), ` | 42 | sequence-every |
| `binary:&&(binary:&&(binary:&&(binary:<=(..), binary:<=(..)), binary:>=(field:maxX(..), field:minX(..))), binar` | 37 | drawing-hit, spatial-collision |
| `apply(fn.apply(fn, call:foldl(..)), Nil) = Nil` | 33 | compact-set |
| `call:foldl(free, Bool:False, fn.fn.call:choose(..)) = Bool:False` | 32 | compact-set, drawing-hit, index-membership |
| `call:foldl(free, call:choose(Bool:False, call:choose(call:choose(..), call:choose(..), Bool:False), Bool:False` | 32 | index-membership, spatial-collision |
| `binary:==(field:active(bound), Bool:False) = Bool:True` | 30 | bulk-update |
| `call:foldl(method:map(method:filter(free, fn), fn.call:intersects(..)), Bool:False, fn.fn.binary:||(..)) = Boo` | 29 | drawing-hit |
| `call:foldl(free, Bool:True, fn.fn.binary:&&(..)) = Bool:True` | 26 | sequence-every |
| `apply(fn.apply(fn, field:out(..)), call:foldl(free, record:__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd` | 25 | compact-set |
| `call:fold_until(free, Bool:True, fn.fn.call:choose(..), fn.fn.binary:&&(..)) = Bool:True` | 24 | sequence-every |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:True` | 24 | incremental-distinct |
| `call:foldl(free, call:choose(Bool:False, Bool:False, Bool:False), fn.fn.binary:||(..)) = Bool:False` | 20 | compact-set, index-membership, spatial-collision |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 320.13 | 38% |
| modular-semantic-laws | 318.81 | 38% |
| contextual-properties | 54.86 | 7% |
| all-published-packages | 45.07 | 5% |
| proved-observations | 21.67 | 3% |
| source-capabilities | 4.55 | 0% |
| whole-state-protocols | 3.02 | 0% |
| whole-action-single-upsert | 2.46 | 0% |
| private-record-elision | 2.41 | 0% |
| guarded-whole-call-8 | 2.36 | 0% |
| private-sum-spines | 2.35 | 0% |
| string-key-dictionaries | 2.28 | 0% |
| boundary-readers | 2.26 | 0% |
| proved-capacities | 2.26 | 0% |
| guarded-whole-call-128 | 2.21 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, sequence-every, spatial-collision, text-lines |
| sets.indexed-construction.u32.word_equal_symmetric | law | ast-ancestor, bulk-update, compact-set, index-membership, text-lines |
| 8c2dc4e9d4ed881c | law | ast-ancestor, bulk-update, incremental-distinct, text-lines |
| b25eacd1251bfc29 | law | compact-set, drawing-hit, index-membership, spatial-collision |
| 5a0cf328fbe55589 | law | drawing-hit, spatial-collision |
| 62d920d8294405dc | law | drawing-hit, spatial-collision |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 08ff52b0bb3c83b5 | law | ast-ancestor |
| 0bdbe209d080be90 | law | drawing-hit |
| 0cfd6e87c2f104eb | law | compact-set |
| 0ed2e74a78dff510 | law | particle-step |
| 1c8d58e0d65c5f8d | law | index-membership |
| 263984509fb6b676 | law | compact-set |
| 2b207c2185c96fe0 | law | compact-set |
| 328a77c62a310366 | law | sequence-every |
| 3c00e05bc235bdba | law | index-membership |
| 403569a6d11563e2 | law | spatial-collision |
| 45f6e0471c2d9c56 | law | drawing-hit |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 4d8433ee77b0d2e1 | law | index-membership |
| 62864679f56e934b | law | bulk-update |
| 67945ed9ba849de3 | law | sequence-every |
| 6830ed35ef507665 | law | ast-ancestor |
| 6e2b34c0f5185fcb | law | compact-set |
| 70c3f8e528eec757 | law | compact-set |
| 73a2a5e50087631b | law | sequence-every |
| 7712312502b1840e | law | drawing-hit |
| 8186d51b8fbbb45d | law | spatial-collision |
| 85e3e0c622235b10 | law | text-lines |
| 89cb065defbc893a | law | sequence-every |
| 8aadb841ec7a269e | law | sequence-every |
| 8d3853b50ae78076 | law | drawing-hit |
| 8e2c50472eec5ace | law | bulk-update |
| 932bf5886a5399aa | law | compact-set |
| 992709f96310f418 | law | drawing-hit |
| a1acacc6c3482ce9 | law | ast-ancestor |
| b0de50753ae48f24 | law | ast-ancestor |
| b3696a807a9bdbb2 | law | ast-ancestor |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
