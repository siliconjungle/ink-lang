# Planning corpus report

Target `javascript`, effort `quick`, compiler `ee25aae98e9b`, knowledge snapshot `c3982e8b543f`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 4 |
| With any knowledge-backed alternative | 4 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 10 |
| Median planning seconds | 18.52 |
| Laws admitted (in 2+ programs) | 9 (0) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 45 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| ast-ancestor | 11 | time | 15 | 3 | 12 | 0 | 3 | measurement_evidence |
| text-lines | 14 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| drawing-hit | 21 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| particle-step | 16 | time | 1 | 1 | 0 | 0 | 1 | measurement_evidence |
| spatial-collision | 73 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| index-membership | 46 | time | 0 | 0 | 0 | 0 | 4 | measurement_evidence |
| incremental-distinct | 12 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| bulk-update | 14 | time | 18 | 3 | 15 | 0 | 3 | measurement_evidence |
| compact-set | 56 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: premise 20, closure 7

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:True` | 9 | ast-ancestor, bulk-update |
| `_ = Bool:False` | 7 | ast-ancestor, bulk-update |
| `binary:==(_, Word:0) = Bool:True` | 4 | bulk-update |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:==(free, Word:0) = Bool:True` | 6 | bulk-update |
| `field:active(bound) = Bool:False` | 4 | bulk-update |
| `field:active(bound) = Bool:True` | 4 | bulk-update |
| `binary:==(field:key(bound), free) = Bool:False` | 2 | ast-ancestor |
| `binary:==(field:key(bound), free) = Bool:True` | 2 | ast-ancestor |
| `apply(fn.binary:==(field:key(..), free), bound) = Bool:False` | 1 | ast-ancestor |
| `apply(fn.binary:==(field:key(..), free), bound) = Bool:True` | 1 | ast-ancestor |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 12.7 | 48% |
| all-published-packages | 7.65 | 29% |
| database-source-algorithms | 4.09 | 16% |
| maintained-folds | 1.11 | 4% |
| proved-observations | 0.25 | 1% |
| index | 0.14 | 0% |
| source-capabilities | 0.09 | 0% |
| pure-routing | 0.09 | 0% |
| proved-capacities | 0.08 | 0% |
| whole-action-coalescing | 0.07 | 0% |
| whole-entry-placement | 0.07 | 0% |
| compact-observer | 0.0 | 0% |
| representation-products | 0.0 | 0% |
| first-order-choices | 0.0 | 0% |
| migration-bridges | 0.0 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 0ed2e74a78dff510 | law | particle-step |
| 4d8433ee77b0d2e1 | law | index-membership |
| 84ebd27c020770e9 | law | index-membership |
| 8e2c50472eec5ace | law | bulk-update |
| a9cd775b6b2b9912 | law | index-membership |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
