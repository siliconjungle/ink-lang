# Knowledge health

`knowledge/tools/knowledge_health.py` reports how reusable the published store is
and how comparable its measurements are. It reads canonical objects, names and
observations directly; its figures are bookkeeping, never proof, applicability or
profitability authority.

```sh
python3 knowledge/tools/knowledge_health.py --root knowledge -o build/knowledge-health
```

## The store on 13 October 2026

After the structure law library was published: 26,954 objects, 517 MB,
192 snapshots and 437,887 dependency edges.

| Measure | Value |
|---|---|
| Rewrites with no dependents | 3,414 of 3,815 |
| Theorems with exactly one dependent | 16,442 of 19,052 |
| Bytes reachable only from one implementation candidate | 178.5 MB (35% of the store), from 24 candidates |
| Bytes reachable only from one representation | 74.3 MB (14%) |
| General laws | 32: contract-algebra (24) and structure laws (8) |
| Concrete laws with no general basis | 3,783 |
| Distinct outlines once value sorts are erased | 3,648 for 3,815 rewrites |
| Rewrites with no conditions | 3,718 |
| Left-hand patterns over 20 nodes | 588 (median 6, maximum 993) |
| Observation cohorts comparing two or more plans | 1,550 of 28,489 (5.4%) |
| Workload groups split across backend labels | 4,353 |
| Distinct toolchain strings | 165 |
| Measured entries attributed to two or more programs | 23 of 417 |

Reading these:

- **The laws differ in structure, not just carrier type.** Erasing value sorts
  merges almost nothing, so generalisation needs laws over structure (a whole
  fold step with assumptions) rather than carrier parameters alone. See
  [structure laws](structure-laws.md). Their instances are generated per program
  at planning time, so the store shows no published instances.
- **Program-specific proof bulk dominates storage.** Over a third of the bytes
  belong to 24 implementation candidates. They could travel with their programs'
  selections instead of growing the shared catalogue; compiled planning
  publishes every admitted candidate into the store it is given.
- **Most measurements cannot rank anything.** Exact matching on
  (program, target, workload) leaves 94.6% of cohorts with a single plan.
  Variants encoded as backend labels and per-build toolchain strings fragment
  cohorts further. Paired, interleaved runs recorded under one target
  description are what make a cohort comparable.
