# Planning corpus report

Target `javascript`, effort `quick`, compiler `c8a2ed6c6939`, knowledge snapshot `89052405cb98`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 7 |
| With any knowledge-backed alternative | 7 |
| Selecting an alternative under defaults | 1 |
| Stopped by the time budget | 7 |
| Median planning seconds | 61.1285 |
| Laws admitted (in 2+ programs) | 17 (2) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 105 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| ast-ancestor | 60 | time | 0 | 0 | 0 | 0 | 21 | measurement_budget |
| text-lines | 55 | states | 0 | 0 | 0 | 0 | 31 | measurement_budget |
| drawing-hit | 52 | time | 0 | 0 | 0 | 0 | 16 | measurement_budget |
| particle-step | 53 | time | 1 | 1 | 0 | 0 | 1 | selected_alternative |
| spatial-collision | 55 | states | 0 | 0 | 0 | 0 | 31 | measurement_budget |
| index-membership | 63 | time | 0 | 0 | 0 | 0 | 28 | measurement_budget |
| incremental-distinct | 110 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| bulk-update | 89 | states | 0 | 0 | 0 | 0 | 31 | measurement_budget |
| compact-set | 148 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 6.29 | 44% |
| database-source-algorithms | 2.51 | 18% |
| proved-observations | 1.94 | 14% |
| maintained-folds | 0.98 | 7% |
| semantic-laws | 0.73 | 5% |
| index | 0.14 | 1% |
| boundary-readers | 0.12 | 1% |
| direct | 0.1 | 1% |
| refresh-on-query | 0.1 | 1% |
| string-key-dictionaries | 0.1 | 1% |
| grouped-index | 0.09 | 1% |
| private-record-elision | 0.09 | 1% |
| whole-action-single-upsert | 0.09 | 1% |
| representation-6 | 0.09 | 1% |
| private-sum-spines | 0.09 | 1% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, drawing-hit, index-membership, spatial-collision, text-lines |
| b25eacd1251bfc29 | law | drawing-hit, index-membership, spatial-collision |
| 0ed2e74a78dff510 | law | particle-step |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 4d8433ee77b0d2e1 | law | index-membership |
| 84ebd27c020770e9 | law | index-membership |
| 85e3e0c622235b10 | law | text-lines |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| a9cd775b6b2b9912 | law | index-membership |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| b912e8d070f87a10 | law | text-lines |
| c194e5ffa5252e0e | law | spatial-collision |
| d772b42ab196c507 | law | ast-ancestor |
| f5a2171264a0873c | law | bulk-update |
| fca76009acdf8700 | law | drawing-hit |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
