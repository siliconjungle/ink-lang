# Planning corpus report

Target `javascript`, effort `quick`, compiler `c403f6a69544`, knowledge snapshot `d3cf4ae7d24b`.

| Measure | Value |
|---|---:|
| Programs compiled | 10 / 10 |
| With an admitted rewrite alternative | 6 |
| With any knowledge-backed alternative | 6 |
| Selecting an alternative under defaults | 4 |
| Stopped by the time budget | 9 |
| Median planning seconds | 21.4165 |
| Laws admitted (in 2+ programs) | 16 (3) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| sequence-every | 31 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| ast-ancestor | 38 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| text-lines | 29 | time | 0 | 0 | 0 | 0 | 0 | no_alternative |
| drawing-hit | 19 | time | 60 | 17 | 28 | 0 | 17 | selected_alternative |
| particle-step | 18 | time | 1 | 1 | 0 | 0 | 1 | profitability |
| spatial-collision | 18 | time | 10 | 5 | 4 | 0 | 5 | selected_alternative |
| index-membership | 23 | states | 50 | 11 | 27 | 0 | 11 | selected_alternative |
| incremental-distinct | 19 | time | 2 | 0 | 2 | 0 | 0 | measurement_budget |
| bulk-update | 20 | time | 18 | 3 | 15 | 0 | 3 | profitability |
| compact-set | 36 | time | 138 | 23 | 95 | 0 | 23 | selected_alternative |

## Near misses

Checker rejection gates: closure 107, premise 64

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:True` | 31 | bulk-update, compact-set, incremental-distinct |
| `_ = Bool:False` | 29 | bulk-update, compact-set, incremental-distinct |
| `binary:==(_, Word:0) = Bool:True` | 4 | bulk-update |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:==(free, Word:0) = Bool:True` | 6 | bulk-update |
| `binary:==(call:fold_until(bound, Bool:False, fn.fn, fn.fn), Bool:False) = Bool:False` | 6 | compact-set |
| `binary:==(call:fold_until(bound, Bool:False, fn.fn, fn.fn), Bool:False) = Bool:True` | 6 | compact-set |
| `binary:==(call:fold_until(field:out(bound), Bool:False, fn.fn, fn.fn), Bool:False) = Bool:False` | 6 | compact-set |
| `binary:==(call:fold_until(field:out(bound), Bool:False, fn.fn, fn.fn), Bool:False) = Bool:True` | 6 | compact-set |
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
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:False` | 1 | incremental-distinct |
| `binary:||(binary:==(field:seen(bound), Bool:False), binary:!=(field:last(bound), bound)) = Bool:True` | 1 | incremental-distinct |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| all-published-packages | 42.67 | 44% |
| semantic-laws | 27.81 | 29% |
| proved-observations | 8.02 | 8% |
| maintained-folds | 5.71 | 6% |
| database-source-algorithms | 2.69 | 3% |
| index | 0.71 | 1% |
| proved-capacities | 0.6 | 1% |
| whole-entry-placement | 0.58 | 1% |
| source-capabilities | 0.54 | 1% |
| pure-routing | 0.49 | 0% |
| grouped-index | 0.47 | 0% |
| refresh-on-query | 0.45 | 0% |
| direct | 0.44 | 0% |
| whole-action-coalescing | 0.39 | 0% |
| private-sum-spines | 0.37 | 0% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 4d8433ee77b0d2e1 | law | compact-set, index-membership |
| 7990f49602301b4c | law | drawing-hit, spatial-collision |
| a9cd775b6b2b9912 | law | compact-set, index-membership |
| 03db601184a24ab1 | law | drawing-hit |
| 0ed2e74a78dff510 | law | particle-step |
| 2bddd185d77fb762 | law | spatial-collision |
| 4d4c3f18bc3fa948 | law | drawing-hit |
| 84ebd27c020770e9 | law | index-membership |
| 8e2c50472eec5ace | law | bulk-update |
| 992709f96310f418 | law | drawing-hit |
| aee4207523acc7ac | law | compact-set |
| c194e5ffa5252e0e | law | spatial-collision |
| c4592c7e11c18584 | law | compact-set |
| f252872b2fa53038 | law | drawing-hit |
| f5a2171264a0873c | law | bulk-update |
| fca76009acdf8700 | law | drawing-hit |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
