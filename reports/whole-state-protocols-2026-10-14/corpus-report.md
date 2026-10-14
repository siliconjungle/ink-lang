# Planning corpus report

Target `javascript`, effort `quick`, compiler `2b930d2f8a29`, knowledge snapshot `b24128bd0b3b`.

| Measure | Value |
|---|---:|
| Programs compiled | 3 / 3 |
| With an admitted rewrite alternative | 2 |
| With any knowledge-backed alternative | 2 |
| Selecting an alternative under defaults | 2 |
| Stopped by the time budget | 2 |
| Median planning seconds | 65.025 |
| Laws admitted (in 2+ programs) | 10 (1) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 65 | states | 0 | 0 | 0 | 0 | 31 | selected_alternative |
| index-membership | 65 | time | 0 | 0 | 0 | 0 | 28 | selected_alternative |
| incremental-distinct | 60 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| database-source-algorithms | 2.27 | 100% |
| compact-observer | 0.0 | 0% |
| representation-products | 0.0 | 0% |
| first-order-choices | 0.0 | 0% |
| migration-bridges | 0.0 | 0% |
| residual-execution-carriers | 0.0 | 0% |
| graph-resources | 0.0 | 0% |
| all-published-packages | 0.0 | 0% |
| semantic-laws | 0.0 | 0% |
| whole-action-coalescing | 0.0 | 0% |
| index | 0.0 | 0% |
| grouped-index | 0.0 | 0% |
| direct | 0.0 | 0% |
| refresh-on-query | 0.0 | 0% |
| representation-5 | 0.0 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | index-membership, sequence-every |
| 328a77c62a310366 | law | sequence-every |
| 4d8433ee77b0d2e1 | law | index-membership |
| 67945ed9ba849de3 | law | sequence-every |
| 67db7578dd2d52c4 | law | sequence-every |
| 73a2a5e50087631b | law | sequence-every |
| 84ebd27c020770e9 | law | index-membership |
| 8aadb841ec7a269e | law | sequence-every |
| a9cd775b6b2b9912 | law | index-membership |
| b25eacd1251bfc29 | law | index-membership |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
