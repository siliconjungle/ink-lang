# Planning corpus report

Target `javascript`, effort `quick`, compiler `750a5f5cb712`, knowledge snapshot `c3982e8b543f`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 7 |
| With any knowledge-backed alternative | 7 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 29.240000000000002 |
| Laws admitted (in 2+ programs) | 16 (2) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 31 | time | 6 | 2 | 4 | 0 | 2 | measurement_evidence |
| ast-ancestor | 28 | time | 15 | 3 | 12 | 0 | 3 | measurement_evidence |
| text-lines | 19 | time | 4 | 0 | 4 | 0 | 0 | no_alternative |
| drawing-hit | 26 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| particle-step | 25 | time | 1 | 1 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 26 | time | 10 | 5 | 4 | 0 | 5 | measurement_evidence |
| index-membership | 30 | time | 50 | 11 | 27 | 0 | 11 | measurement_evidence |
| incremental-distinct | 30 | time | 2 | 0 | 2 | 0 | 0 | no_alternative |
| bulk-update | 48 | time | 18 | 3 | 15 | 0 | 3 | measurement_evidence |
| compact-set | 34 | time | 0 | 0 | 0 | 0 | 20 | measurement_evidence |

## Near misses

Checker rejection gates: closure 42, premise 25, other 1

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:True` | 11 | ast-ancestor, bulk-update, incremental-distinct, text-lines |
| `_ = Bool:False` | 9 | ast-ancestor, bulk-update, incremental-distinct, text-lines |
| `binary:==(_, Word:0) = Bool:True` | 5 | bulk-update, text-lines |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:==(free, Word:0) = Bool:True` | 6 | bulk-update |
| `field:active(bound) = Bool:False` | 4 | bulk-update |
| `field:active(bound) = Bool:True` | 4 | bulk-update |
| `binary:==(field:key(bound), free) = Bool:False` | 2 | ast-ancestor |
| `binary:==(field:key(bound), free) = Bool:True` | 2 | ast-ancestor |
| `apply(fn.binary:==(field:key(..), free), bound) = Bool:False` | 1 | ast-ancestor |
| `apply(fn.binary:==(field:key(..), free), bound) = Bool:True` | 1 | ast-ancestor |
| `binary:==(call:choose(binary:||(binary:==(..), binary:&&(..)), Word:1, Word:0), Word:0) = Bool:True` | 1 | text-lines |
| `binary:||(binary:==(bound, Word:13), binary:&&(binary:==(bound, Word:10), binary:!=(field:previous(..), Word:1` | 1 | text-lines |
| `binary:||(binary:==(bound, Word:13), binary:&&(binary:==(bound, Word:10), binary:!=(field:previous(..), Word:1` | 1 | text-lines |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:False` | 1 | incremental-distinct |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:True` | 1 | incremental-distinct |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 38.35 | 43% |
| all-published-packages | 29.86 | 34% |
| database-source-algorithms | 4.27 | 5% |
| direct | 1.17 | 1% |
| refresh-on-query | 1.14 | 1% |
| grouped-index | 1.08 | 1% |
| index | 0.99 | 1% |
| whole-action-coalescing | 0.74 | 1% |
| representation-18 | 0.73 | 1% |
| representation-5 | 0.68 | 1% |
| packed-rows | 0.61 | 1% |
| representation-7 | 0.61 | 1% |
| representation-8 | 0.56 | 1% |
| representation-15 | 0.55 | 1% |
| representation-6 | 0.52 | 1% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 4d8433ee77b0d2e1 | law | compact-set, index-membership |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 0ed2e74a78dff510 | law | particle-step |
| 2bddd185d77fb762 | law | spatial-collision |
| 328a77c62a310366 | law | sequence-every |
| 73a2a5e50087631b | law | sequence-every |
| 7990f49602301b4c | law | spatial-collision |
| 84ebd27c020770e9 | law | index-membership |
| 8e2c50472eec5ace | law | bulk-update |
| aee4207523acc7ac | law | compact-set |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| c194e5ffa5252e0e | law | spatial-collision |
| c4592c7e11c18584 | law | compact-set |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
