# Aggregating filtered sorted lists

The DB adds nine executable rewrites for u32/u64/i32 input lists:

```text
length(xs.sort().filter(p)) = length(xs.filter(p))
count(xs.sort().filter(p))  = count(xs.filter(p))
sum(xs.sort().filter(p))    = sum(xs.filter(p))
```

They apply to pure value-based predicates. Cardinality ignores order, and the
integer sum primitive uses wrapping arithmetic. No floating sum reorder law is
introduced. Returning the filtered ordered list still requires sorting. Indexed
predicates and effectful callbacks are not covered by these source endpoints.

The earlier sort aggregation laws could not remove sorting with a filter
between it and the aggregate. The new sum law also composes with the earlier
filter/sum fusion, eliminating the intermediate filtered list after sorting is
removed. These are database entries, not compiler optimisation cases.

`knowledge/producers/filtered_sort_laws.py` produces nine roots and eighteen
insertion lemmas. Each helper conditions on whether the inserted value passes
the predicate, then proves aggregate preservation by list induction and cases
on the insertion comparison and existing head's predicate. Each root uses list
induction, splits on its head's predicate, and instantiates the kept or dropped
helper with an exact checked premise. Source callers have no extra condition.
The existing checker replays the dependency closure; no core or planner rule
changed. Proof-only insertion terms add no source syntax.

The canonical snapshot contains 915 entries and 295 checked semantic laws:
268 executable roots and 27 proof-only insertion dependencies. The new bounded
view is `knowledge/store/filtered-sort-view.json`. The full producer reproduces
the snapshot, names and all six named views byte-for-byte; earlier immutable
objects and snapshots remain available.

`tests/filtered_sort_optimisation.rs` checks all 27 new proofs, rehashed false
typed endpoints, swapped predicate premises, missing dependencies and forged
applications to ordered results or a changed predicate. It compares empty,
previous and current DB selection with the identical compiler binary. The
previous snapshot retains all ten example sorts (including a captured lambda);
the current selection removes them while keeping the observed ordered list.
Independent oracles and exact snapshots are compared for 117 requests across
native C/Rust, JavaScript and both Wasm paths.

`bench/filtered-sort` compares native Rust execution selected by the previous
snapshot with selection from the new snapshot, using identical source, compiler
and backend. See its README and archived samples for costs and confidence
intervals, and `reports/filtered-sort/validation.json` for replay evidence.
Logical equality does not cover allocation failure, fuel, traps or timing and
does not prove the checker or backend implementations correct.
