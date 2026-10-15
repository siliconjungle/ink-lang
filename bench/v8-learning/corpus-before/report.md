# Planning corpus report

Target `javascript`, effort `quick`, compiler `9d7057b5c0b1`, knowledge snapshot `dfa5febf2e6f`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 9 |
| With any knowledge-backed alternative | 9 |
| Selecting an alternative under defaults | 1 |
| Stopped by the time budget | 10 |
| Median planning seconds | 21.308999999999997 |
| Laws admitted (in 2+ programs) | 30 (7) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 19 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| ast-ancestor | 21 | time | 0 | 0 | 0 | 0 | 22 | measurement_budget |
| text-lines | 19 | time | 0 | 0 | 0 | 0 | 16 | measurement_budget |
| drawing-hit | 23 | time | 0 | 0 | 0 | 0 | 16 | measurement_budget |
| particle-step | 19 | time | 1 | 1 | 0 | 0 | 1 | profitability |
| spatial-collision | 22 | time | 0 | 0 | 0 | 0 | 16 | measurement_budget |
| index-membership | 21 | time | 0 | 0 | 0 | 0 | 17 | selected_alternative |
| incremental-distinct | 20 | time | 0 | 0 | 0 | 0 | 21 | measurement_budget |
| bulk-update | 23 | time | 0 | 0 | 0 | 0 | 25 | measurement_budget |
| compact-set | 42 | time | 0 | 0 | 0 | 0 | 16 | measurement_budget |

## Near misses

Checker rejection gates: none

| Failed premise shape | Rejections | Programs |
|---|---:|---|

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 13.28 | 61% |
| database-source-algorithms | 2.75 | 13% |
| proved-observations | 2.44 | 11% |
| semantic-laws | 1.13 | 5% |
| maintained-folds | 0.99 | 4% |
| index | 0.11 | 0% |
| source-capabilities | 0.09 | 0% |
| whole-state-protocols | 0.09 | 0% |
| private-sum-spines | 0.09 | 0% |
| pure-routing | 0.08 | 0% |
| scalar-observation-arguments | 0.08 | 0% |
| small-carrier-inline | 0.08 | 0% |
| bit-guards | 0.08 | 0% |
| grouped-index | 0.08 | 0% |
| whole-entry-placement | 0.08 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 7069b2b125e492c9 | law | ast-ancestor, bulk-update, compact-set, drawing-hit, incremental-distinct, index-membership, spatial-collision, text-lines |
| sets.indexed-construction.u32.word_equal_symmetric | law | ast-ancestor, bulk-update, compact-set, index-membership, text-lines |
| 8c2dc4e9d4ed881c | law | ast-ancestor, bulk-update, incremental-distinct, text-lines |
| b25eacd1251bfc29 | law | compact-set, drawing-hit, index-membership, spatial-collision |
| 4d8433ee77b0d2e1 | law | compact-set, index-membership |
| 7990f49602301b4c | law | drawing-hit, spatial-collision |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 08ff52b0bb3c83b5 | law | ast-ancestor |
| 0ed2e74a78dff510 | law | particle-step |
| 1c8d58e0d65c5f8d | law | index-membership |
| 2b207c2185c96fe0 | law | compact-set |
| real-software-control/instance/shared-inner-choice/U32 | law | bulk-update |
| 4be4887089b90e11 | law | ast-ancestor |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 6830ed35ef507665 | law | ast-ancestor |
| 6da09dd3640fe64e | law | compact-set |
| 84ebd27c020770e9 | law | index-membership |
| 85e3e0c622235b10 | law | text-lines |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| b0de50753ae48f24 | law | ast-ancestor |
| b4bdd6f06eb1fac4 | law | ast-ancestor |
| b912e8d070f87a10 | law | text-lines |
| c194e5ffa5252e0e | law | spatial-collision |
| c220b4afd1d5f778 | law | ast-ancestor |
| d772b42ab196c507 | law | ast-ancestor |
| dbadd511948f0a8f | law | index-membership |
| f5a2171264a0873c | law | bulk-update |
| fca76009acdf8700 | law | drawing-hit |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
