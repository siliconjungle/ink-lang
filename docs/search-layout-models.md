# Complete-row search contracts

The database now contains a lower-bound search model for the actual `Row` and nested `Ledger` source payload sorts. `knowledge/research/source-search-layout` and `knowledge/research/source-search-ledger` add 41 objects each: two datatypes, 17 functions and 22 theorems. Their complete closures contain 122 and 121 objects, within the unchanged 128-object limit.

A search returns a `SearchCut`. A missing key has the sequence before its insertion gap and the sequence after it. A found key additionally holds the actual key and complete row, between the prefix and suffix. Searching uses the same equality and lexicographic two-word comparison as the existing ordered-write model. It scans linearly; native storage still uses Rust binary search.

The unchanged generic kernel checks these universal results:

- Reassembling the cut reproduces the complete original sequence. This holds even for unsorted or duplicate input.
- Applying an insertion, replacement or removal at the cut equals the existing ordered-write model, including the complete remaining sequence.
- For sorted input, the found optional row equals independent linear lookup. A search that stops at a gap has not skipped a later matching row.
- Every prefix key is smaller than the searched key. For sorted input, every suffix key is greater. A found key matches the searched key. The validity predicate is also proved equal to these concrete conditions on both cut constructors.
- Every finite write history starting sorted leaves a valid search cut for any subsequent key.
- A found entry lies at the prefix length in the original sequence, with its actual key and complete payload. This position theorem holds independently of sortedness; sortedness is required to identify a missing gap as an ordered-map insertion position.

Positions use the existing unbounded unary `Natural` datatype. No theorem silently identifies those positions with native `usize` arithmetic, pointer offsets or allocation bounds. Reassembly alone is also insufficient: a reversed sequence can reconstruct exactly while an early stopping search misses a row. Executed reversed/duplicate witnesses exercise this distinction.

The producer adds matching-key replacement evidence from the two 64-bit components using external SAT/RUP certificates. Inductive proofs derive lookup absence from exclusion and lower bounds, then connect it to search. Guarded equalities keep state-dependent assumptions inside branches rather than leaking them into induction hypotheses over other states. No search, order or optimization law is added to the compiler core.

## Smaller checked libraries

The new generic `project-library` command selects public roots and their exact immutable dependency closure. It validates the entire input first, so selecting a good root cannot hide an unrelated false theorem. Dependencies stay private unless explicitly requested as public roots. Every selected raw object retains its original content identity.

Source binding now requires the independently reconstructed source definitions and their actual ancestry, rather than every unrelated maintenance theorem originally packaged beside them. The original maintenance certificate is still checked independently when reconstructing the source model. Every source definition must remain a direct import, match its exact derived declaration, and retain its immutable ancestry. Source AST, certificate, schema, key adapter and projection bindings are unchanged. Complete payload wrapper checks remain in force.

For the two fixtures, source semantic closures require 18 and 17 objects instead of carrying the full 73/70-object source exports. Default exports remain unchanged. The search producer retains 81/80 parent objects because it also needs sortedness, uniqueness, history and row/column correspondence proofs. It explicitly imports needed definitions after checked projection. All original row/column/sorted packages continue to check.

```sh
ink project-library LOCK.json ROOTS.json -o BUNDLE.json
```

`ROOTS.json` is an array of content identities. Projection is dependency selection, not candidate admission or proof authority creation.

## Validation

Both search packages reproduce byte for byte and bind to current source with the new compiler. The preceding whole-row kernel checks their mathematical libraries without any new rule. The full suite passes 96 tests without warnings.

The new native comparisons cover 128 write prefixes and 1,024 search queries across both schemas. They compare exact cut reconstruction, validity, complete optional rows, insertion/replacement/removal results, sorted enumeration and found entries at their proved mathematical positions. Two Rust binary-search forms agree with all positions: 2,048 position comparisons. Four native storage variants supply 4,096 lookup comparisons and 512 mutation/returned-value/enumeration comparisons, including checked hints and promotion. Boundary keys include the two 64-bit words, repeated keys and gaps.

Eighteen fully rehashed false models are rejected: disabled search or writes, missing values/entries, incorrect positions, and weakened prefix/suffix/key/validity predicates. Their full dependency identities are rebuilt, so rejection does not come from stale hashes. Projection tests additionally reject an unrelated well-typed false theorem before selection, check public/private visibility, and exercise missing ancestry, hidden source definitions, empty libraries and certificate mismatch.

Evidence is retained in `reports/source-search-layout-phase1`. Five benchmark bodies and plans reproduce exactly with the new compiler, and all 44 preserved lifecycle binaries retain their hashes. Runtime and generic proof-kernel source are unchanged. There is no new runtime speed claim.

```sh
python3 tools/audit_search_layouts.py --reproduce --python /path/to/python-with-python-sat
python3 dev.py test
```

## Remaining link to native execution

The cuts now specify the semantic result and position contract needed from native search. The actual Rust standard-library binary-search loop, `usize` arithmetic, buffer indexing/moves, allocation and promotion are still trusted implementations supported by finite comparisons. They are not formal refinements of these functions yet. Connecting the native result to these contracts, source actions, cache/undo, effects, snapshots and safe candidate installation remains required before database representation admission.

The next work is native search/position correspondence and complete update/transaction observations, followed by bounded candidate selection using the existing lifecycle costs. General ownership/arenas, compact links, inline variable-size data, direct construction, durable recovery, broader language coverage and fair performance evaluation remain part of the full objective.
