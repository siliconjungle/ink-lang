# Planning corpus report

Target `javascript`, effort `balanced`, compiler `d3394e17807e`, knowledge snapshot `c3982e8b543f`.

| Measure | Value |
|---|---:|
| Programs compiled | 1 / 1 |
| With an admitted rewrite alternative | 1 |
| With any knowledge-backed alternative | 1 |
| Selecting an alternative under defaults | 0 |
| Stopped by the time budget | 1 |
| Median planning seconds | 95.258 |
| Laws admitted (in 2+ programs) | 4 (0) |
| Representations admitted | 0 |

## Programs

| Program | Seconds | Stop | Matched | Admitted | Rejected | Unchecked | Rewrite alts | Last gate |
|---|---:|---|---:|---:|---:|---:|---:|---|
| compact-set | 95 | time | 138 | 23 | 95 | 0 | 23 | measurement_evidence |

## Near misses

Checker rejection gates: premise 48, closure 47

| Failed premise shape | Rejections | Programs |
|---|---:|---|
| `_ = Bool:False` | 24 | compact-set |
| `_ = Bool:True` | 24 | compact-set |

| Failed premise as instantiated in the program | Rejections | Programs |
|---|---:|---|
| `binary:==(call:fold_until(bound, Bool:False, fn.fn, fn.fn), Bool:False) = Bool:False` | 6 | compact-set |
| `binary:==(call:fold_until(bound, Bool:False, fn.fn, fn.fn), Bool:False) = Bool:True` | 6 | compact-set |
| `binary:==(call:fold_until(field:out(bound), Bool:False, fn.fn, fn.fn), Bool:False) = Bool:False` | 6 | compact-set |
| `binary:==(call:fold_until(field:out(bound), Bool:False, fn.fn, fn.fn), Bool:False) = Bool:True` | 6 | compact-set |
| `binary:==(call:contains(bound, bound), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:contains(bound, bound), Bool:False) = Bool:True` | 3 | compact-set |
| `binary:==(call:contains(field:out(bound), bound), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:contains(field:out(bound), bound), Bool:False) = Bool:True` | 3 | compact-set |
| `binary:==(call:foldl(bound, Bool:False, fn.fn), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:foldl(bound, Bool:False, fn.fn), Bool:False) = Bool:True` | 3 | compact-set |
| `binary:==(call:foldl(field:out(bound), Bool:False, fn.fn), Bool:False) = Bool:False` | 3 | compact-set |
| `binary:==(call:foldl(field:out(bound), Bool:False, fn.fn), Bool:False) = Bool:True` | 3 | compact-set |

## Where planning time went

| Recipe | Seconds | Share |
|---|---:|---:|
| semantic-laws | 10.18 | 24% |
| all-published-packages | 9.29 | 22% |
| proved-observations | 5.98 | 14% |
| representation-18 | 1.39 | 3% |
| maintained-folds | 1.32 | 3% |
| packed-rows | 0.77 | 2% |
| whole-entry-placement | 0.68 | 2% |
| grouped-index | 0.68 | 2% |
| refresh-on-query | 0.62 | 2% |
| direct | 0.6 | 2% |
| representation-12 | 0.57 | 1% |
| private-record-elision | 0.56 | 1% |
| invariant-representations | 0.53 | 1% |
| representation-16 | 0.52 | 1% |
| sequence-tree | 0.48 | 1% |

## Admitted knowledge by program

| Entry | Kind | Programs |
|---|---|---|
| 4d8433ee77b0d2e1 | law | compact-set |
| a9cd775b6b2b9912 | law | compact-set |
| aee4207523acc7ac | law | compact-set |
| c4592c7e11c18584 | law | compact-set |

Observed default planning on a fixed corpus; no proof, applicability or profitability authority.
