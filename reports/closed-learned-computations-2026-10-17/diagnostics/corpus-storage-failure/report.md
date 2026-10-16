# Planning corpus report

Target `rust`, effort `balanced`, compiler `58503bcf6e24`, knowledge snapshot `14edbdd3dea8`.

| Measure | Value |
|---|---:|
| Programs compiled | 9 / 10 |
| With an admitted rewrite alternative | 9 |
| With any knowledge-backed alternative | 9 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 8 |
| Median planning seconds | 95.839 |
| Laws admitted (in 2+ programs) | 54 (5) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 91 | time | 12318 | 338 | 244 | 11602 | 19 | measurement_budget |
| ast-ancestor | 96 | time | 5626 | 348 | 269 | 4915 | 28 | measurement_budget |
| text-lines | 88 | time | 10376 | 320 | 240 | 9654 | 39 | measurement_budget |
| drawing-hit | 98 | time | 17002 | 238 | 307 | 16405 | 30 | measurement_budget |
| particle-step | 53 | fixed-point | 20 | 20 | 0 | 0 | 8 | measurement_budget |
| spatial-collision | failed | | | | | | |  658, in main
    compiled_cache.save(root,next_key,selected |
| index-membership | 103 | time | 22347 | 298 | 311 | 21626 | 35 | measurement_budget |
| incremental-distinct | 95 | time | 15042 | 660 | 496 | 13638 | 11 | measurement_budget |
| bulk-update | 96 | time | 9476 | 338 | 494 | 8462 | 38 | measurement_budget |
| compact-set | 109 | time | 20395 | 213 | 340 | 19679 | 24 | measurement_budget |

## Near misses

Checker rejection gates: premise 2050, closure 645, other 6

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:False` | 1171 | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, text-lines |
| `_ = Bool:True` | 377 | ast-ancestor, bulk-update, compact-set, incremental-distinct, sequence-every, text-lines |
| `binary:==(_, Word:0) = Bool:True` | 238 | bulk-update, text-lines |
| `_ = Nil` | 112 | compact-set |
| `field:active(_) = Bool:False` | 66 | bulk-update |
| `binary:||(binary:==(field:seen(..), Bool:False), binary:!=(field:last(..), _)) = Bool:Fals` | 20 | incremental-distinct |
| `field:active(_) = Bool:True` | 16 | bulk-update |
| `binary:||(binary:==(field:seen(..), Bool:False), binary:!=(field:last(..), _)) = Bool:True` | 12 | incremental-distinct |
| `call:word_and(_, _) = Word:0` | 8 | bulk-update, text-lines |
| `binary:==(field:seen(_), Bool:False) = Bool:False` | 4 | incremental-distinct |
| `binary:||(_, _) = Bool:True` | 4 | bulk-update |
| `binary:<(_, _) = Bool:True` | 2 | sequence-every |
| `binary:==(field:key(_), _) = Bool:False` | 2 | ast-ancestor |
| `binary:==(field:key(_), _) = Bool:True` | 2 | ast-ancestor |
| `binary:==(_, Word:10) = Bool:True` | 2 | text-lines |
| `binary:==(_, Word:13) = Bool:False` | 2 | text-lines |
| `binary:||(binary:==(_, Word:13), binary:&&(binary:==(..), binary:!=(..))) = Bool:False` | 2 | text-lines |
| `binary:||(binary:==(_, Word:13), binary:&&(binary:==(..), binary:!=(..))) = Bool:True` | 2 | text-lines |
| `binary:&&(binary:&&(binary:<=(..), binary:<=(..)), binary:>=(field:maxX(..), field:minX(..` | 2 | drawing-hit |
| `binary:&&(binary:<=(field:minX(..), field:maxX(..)), binary:<=(field:minY(..), field:maxY(` | 2 | drawing-hit |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:False` | 412 | incremental-distinct |
| `binary:==(call:choose(binary:||(binary:==(..), binary:&&(..)), Word:1, Word:0), Word:0) = Bool:True` | 212 | text-lines |
| `field:active(bound) = Bool:False` | 154 | bulk-update |
| `binary:==(field:key(bound), free) = Bool:False` | 97 | ast-ancestor |
| `binary:==(free, field:key(bound)) = Bool:False` | 96 | ast-ancestor |
| `call:foldl(free, call:choose(Bool:True, Bool:True, call:choose(call:choose(..), Bool:True, call:choose(..))), ` | 56 | sequence-every |
| `field:out(call:foldl(free, record:__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd2d35582c49f6f96b53fd8155_` | 50 | compact-set |
| `field:active(bound) = Bool:True` | 48 | bulk-update |
| `call:foldl(free, Bool:False, fn.fn.binary:||(..)) = Bool:False` | 45 | compact-set, index-membership |
| `binary:==(field:active(bound), Bool:False) = Bool:True` | 30 | bulk-update |
| `call:foldl(free, call:choose(Bool:False, call:choose(call:choose(..), call:choose(..), Bool:False), Bool:False` | 28 | index-membership |
| `call:foldl(free, Bool:False, fn.fn.call:choose(..)) = Bool:False` | 27 | compact-set, drawing-hit, index-membership |
| `call:foldl(free, Bool:True, fn.fn.binary:&&(..)) = Bool:True` | 26 | sequence-every |
| `apply(fn.apply(fn, call:foldl(..)), Nil) = Nil` | 26 | compact-set |
| `apply(fn.apply(fn, field:out(..)), call:foldl(free, record:__ink_loop_7ffbebe14e03c87ce472d07a0730652e389294fd` | 25 | compact-set |
| `call:fold_until(free, Bool:True, fn.fn.call:choose(..), fn.fn.binary:&&(..)) = Bool:True` | 24 | sequence-every |
| `call:foldl(method:map(method:filter(free, fn), fn.call:intersects(..)), Bool:False, fn.fn.binary:||(..)) = Boo` | 24 | drawing-hit |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:True` | 24 | incremental-distinct |
| `binary:&&(binary:&&(binary:&&(binary:<=(..), binary:<=(..)), binary:>=(field:maxX(..), field:minX(..))), binar` | 19 | drawing-hit |
| `call:foldl(free, call:choose(Bool:True, Bool:True, call:choose(call:choose(..), Bool:True, Bool:True)), fn.fn.` | 16 | sequence-every |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 284.94 | 39% |
| modular-semantic-laws | 282.02 | 39% |
| all-published-packages | 41.06 | 6% |
| contextual-properties | 31.18 | 4% |
| proved-observations | 19.95 | 3% |
| source-capabilities | 4.04 | 1% |
| whole-state-protocols | 2.85 | 0% |
| private-record-elision | 2.26 | 0% |
| private-sum-spines | 2.24 | 0% |
| proved-capacities | 2.21 | 0% |
| boundary-readers | 2.2 | 0% |
| string-key-dictionaries | 2.2 | 0% |
| guarded-whole-call-8 | 2.1 | 0% |
| guarded-whole-call-128 | 2.04 | 0% |
| guarded-whole-call-2048 | 2.01 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, sequence-every, text-lines |
| sets.indexed-construction.u32.word_equal_symmetric | law | ast-ancestor, bulk-update, compact-set, index-membership, text-lines |
| 8c2dc4e9d4ed881c | law | ast-ancestor, bulk-update, incremental-distinct, text-lines |
| b25eacd1251bfc29 | law | compact-set, drawing-hit, index-membership |
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
| 45f6e0471c2d9c56 | law | drawing-hit |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 4d8433ee77b0d2e1 | law | index-membership |
| 5a0cf328fbe55589 | law | drawing-hit |
| 62864679f56e934b | law | bulk-update |
| 62d920d8294405dc | law | drawing-hit |
| 67945ed9ba849de3 | law | sequence-every |
| 6830ed35ef507665 | law | ast-ancestor |
| 6e2b34c0f5185fcb | law | compact-set |
| 70c3f8e528eec757 | law | compact-set |
| 73a2a5e50087631b | law | sequence-every |
| 7712312502b1840e | law | drawing-hit |
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
| b3ca3611d089273e | law | compact-set |
| b4bdd6f06eb1fac4 | law | ast-ancestor |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
