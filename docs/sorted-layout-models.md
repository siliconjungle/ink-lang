# Sorted and unique layout invariants

The source-bound row/column model now has database proofs that valid ordered stores stay sorted and unique through every finite insert, replace and remove history. The compiler, generic kernel and native runtime are unchanged.

`knowledge/research/source-sorted-layout` binds the nine-field `Row` source schema; `knowledge/research/source-sorted-ledger` binds the nested `Ledger` schema. Each adds 22 objects: five functions and 17 theorems. The packages retain the necessary closure from the earlier [layout correspondence](column-layout-models.md), plus the original source authority. Their complete closures contain 128 and 125 objects. No checker resource limit was increased.

The key comparison is the existing lexicographic comparison of two unsigned 64-bit words. External SAT certificates prove transitivity, forward order when equality and reverse order are absent, and inequality in the presence of strict order. The generic kernel independently reconstructs the bitvector obligations and checks the RUP proofs. The SAT solver is not part of the compiler or its trust boundary.

`sorted_rows_above(rows, bound)` requires every row key to be greater than `bound`. `sorted_rows(rows)` requires the tail to be sorted and every tail key to be greater than the head key. This all-tail definition supplies explicit bounds for insertion and derives uniqueness; it does not rely on an unproved adjacent-key shortcut.

The new universal proofs establish:

- Lower bounds transport through key order and survive writes when the written key is above the bound.
- Insertions, replacements and removals preserve sortedness from a sorted starting row sequence, including repeated-key writes and absent removal.
- Every finite write history preserves sortedness.
- Sorted rows contain no duplicate keys, using a separate exclusion/uniqueness predicate.
- Encoding rows into columns preserves the validity predicate, and every future column write history preserves validity.

The column validity predicate checks both equal lane lengths and sortedness of the joined rows. Sortedness of a truncating zip alone would accept a malformed unmatched tail. The combined predicate rejects either lane being longer than the other. A malformed input cannot be admitted merely because its surviving prefix is sorted.

Induction precedes the branch assumptions. The theorems encode their premises as guarded Boolean equalities, so a fixed assumption about one state cannot leak into an induction hypothesis quantified over another state. Boolean conjunction facts and key-order laws are database theorems, not new core rules.

## Executed validation

Both packages are bound to current source types and projections and check under the preserved source-row compiler and the earlier whole-row kernel. Fresh proof generation reproduces every object, CNF, SAT certificate and manifest byte for byte.

The new comparison runs 128 write prefixes through both logical layouts and two native flat stores, checking sortedness, uniqueness, column alignment and complete ordered enumeration. Existing layout tests continue to compare 512 prefixes with four native storage variants and a tree oracle. The key checks cover 128 boundary-key pairs, testing both comparison and equality, and 1,024 transitivity combinations. Reversal, duplicate, high-word alias and mismatched-lane witnesses exercise rejection conditions.

Twelve fully rehashed false models are rejected: always-false order, missing writes and always-true lower-bound, sortedness, uniqueness or exclusion predicates. This rebuilds all dependent identities; stale content hashes do not explain rejection. The full suite passes 89 tests without warnings. Evidence is retained in `reports/source-sorted-layout-phase1`.

The generic evaluator retains its fixed resource budget. Concrete comparisons use bounded stores, while the checked theorems quantify over arbitrary finite sequences and histories. A native comparison is finite evidence, not formal native implementation refinement.

## Next correspondence

These are invariants of the database-defined linear-search write model. Native storage still uses Rust `Vec`, binary search, a checked index hint and optional tree promotion. The next work must prove the search/index contract and connect actual native operations to the model, then combine storage evidence with source actions, cache/undo, effects and snapshot installation. These packages alone do not authorize native representation replacement.

The subsequent [search-cut packages](search-layout-models.md) now prove the semantic lookup/gap, mutation and mathematical position contract. Native binary search and machine indexing remain the next correspondence; the original packages and evidence here are unchanged.

Runtime code, five recorded benchmark bodies/plans and 44 measured lifecycle binaries remain unchanged. This milestone makes the verification boundary more complete; it adds no runtime speedup. The full language, database admission and performance objectives remain active.

```sh
python3 tools/audit_sorted_layouts.py --reproduce --python /path/to/python-with-python-sat
python3 dev.py test
```

The external producer requires the same `python-sat` environment used for the existing bitvector packages. The compiler consumes only the checked proof objects.
