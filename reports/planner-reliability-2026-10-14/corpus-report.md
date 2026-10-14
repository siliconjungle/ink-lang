# Planning corpus report

Target `javascript`, effort `quick`, compiler `ae0193222a7e`, knowledge snapshot `12c02889be3f`.

| Measure | Value |
|---|---:|
| Programs compiled | 3 / 3 |
| With an admitted rewrite alternative | 2 |
| With any knowledge-backed alternative | 2 |
| Selecting an alternative under defaults | 2 |
| Stopped by the time budget | 3 |
| Median planning seconds | 101.519 |
| Laws admitted (in 2+ programs) | 5 (0) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 82 | time | 6 | 2 | 4 | 0 | 2 | selected_alternative |
| index-membership | 108 | time | 50 | 11 | 27 | 0 | 11 | selected_alternative |
| incremental-distinct | 102 | time | 2 | 0 | 2 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: closure 31, premise 2

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:False` | 1 | incremental-distinct |
| `_ = Bool:True` | 1 | incremental-distinct |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:False` | 1 | incremental-distinct |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:True` | 1 | incremental-distinct |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 15.12 | 44% |
| all-published-packages | 14.13 | 41% |
| proved-observations | 1.49 | 4% |
| maintained-folds | 1.23 | 4% |
| database-source-algorithms | 0.83 | 2% |
| source-capabilities | 0.3 | 1% |
| pure-routing | 0.26 | 1% |
| index | 0.14 | 0% |
| refresh-on-query | 0.1 | 0% |
| direct | 0.1 | 0% |
| grouped-index | 0.09 | 0% |
| whole-action-early-return | 0.09 | 0% |
| private-sum-spines | 0.09 | 0% |
| contract-witnesses | 0.09 | 0% |
| literal-physical-alternatives | 0.09 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 328a77c62a310366 | law | sequence-every |
| 4d8433ee77b0d2e1 | law | index-membership |
| 73a2a5e50087631b | law | sequence-every |
| 84ebd27c020770e9 | law | index-membership |
| a9cd775b6b2b9912 | law | index-membership |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
