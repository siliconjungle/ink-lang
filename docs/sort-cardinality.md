# Sort aggregation laws

The knowledge DB supplies nine executable laws: `length(xs.sort()) = length(xs)`,
`count(xs.sort()) = count(xs)`, and `sum(xs.sort()) = sum(xs)`, each for u32/u64/i32
input lists. These skip a sort whose ordering is discarded by an aggregate.
Integer sums retain the language's wrapping arithmetic. No floating-point sum
law is supplied: changing addition order can change its result.

`knowledge/producers/sort_cardinality_laws.py` also supplies nine insertion
lemmas. Each uses list induction and cases on the actual insertion comparison.
Each sort law uses list induction, exact instantiation of its insertion lemma,
and the induction hypothesis. All dependencies and proof bytes are replayed
locally by the existing checker; no primitive, checker rule or compiler code
changed. Helper `list.insert` terms are proof vocabulary, not new source syntax.

The six cardinality laws retain the actual u32 length/u64 count increment order
and wrap semantics. The three sum laws use the existing integer arithmetic
normalizer; they grant no floating arithmetic or generic reducer authority.
Sorting remains when the program returns its ordered list. A sort in a different
expression is not covered by an aggregate law's application endpoints.

The bounded view is `knowledge/store/sort-cardinality-view.json`: nine roots and
nine dependencies. The canonical snapshot now contains 888 entries, including
268 executable semantic laws (259 roots in the full rewrite view and nine
insertion dependencies). Rebuilding from the producers reproduces the active
snapshot, names and all five bounded views. Earlier immutable snapshots remain.

The example in `examples/sort-cardinality.ink` exercises all nine laws and a
filtered/map/sort/count pipeline that composes with the earlier map-count law.
The integration tests compare an empty DB with the new DB using the same
compiler binary, inspect selected expressions, reject rehashed false laws and
missing dependencies, reject an application to an observed sorted list, and
compare independent expected values and exact snapshots on all five CPU paths.

Run:

```sh
cargo test --test sort_cardinality_optimisation
python3 bench/sort-cardinality/run.py
```

See `bench/sort-cardinality/README.md` for measured native Rust costs and
`reports/sort-cardinality/validation.json` for replay/test evidence. Equality
covers total logical values. Allocation failure, fuel exhaustion, physical
emission and checker correctness retain their existing trust boundaries.
