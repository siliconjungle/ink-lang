# Source-bound row and column layouts

Two database packages now prove a sequence layout correspondence for actual Ink row types. A row layout stores a list of `(key, row)` entries; a column layout stores separate lists of keys and complete rows. The compiler and generic proof kernel are unchanged. An external Python producer creates the definitions and proofs, and the preserved compiler checks them.

The packages are `knowledge/research/source-column-layout` for the nine-field `Row` fixture and `knowledge/research/source-column-ledger` for nested `Ledger` records. Each adds 38 objects: seven datatypes, 19 functions and 12 theorems. Their total closures contain 111 and 108 objects, respectively. The existing source model verifier binds the actual row sorts, numeric/nominal ID key adapters and contribution expressions. It does not grant these new layout functions native admission.

The model uses the same 128-bit key words as the table foundation. Lookup scans for matching keys. Writes compare keys lexicographically: replace or remove a matching entry, insert before a greater entry, or continue down the sequence. The column algorithm applies the same decisions to both lanes. The universal representation correspondence does not require a sortedness premise: both algorithms make the same decisions on any row sequence. That is useful for representation refinement, but it also means the theorem alone cannot establish that the shared algorithm implements a correct ordered map.

The checked theorems establish:

- Splitting a row sequence into columns and joining it again recovers every key and complete payload in the same order.
- Lookup returns the same optional row in either representation.
- Insertion, replacement and removal commute with encoding.
- Every finite write history commutes with encoding; joining the final columns gives the exact final row sequence. Applying the theorem to each prefix covers intermediate sequence states.
- Encoded columns have aligned lane lengths, and writes preserve that alignment for every finite history.
- When the alignment checker accepts external columns, joining and splitting them again returns the original columns. Without alignment, joining can silently discard an unmatched tail.

These statements quantify over arbitrary complete source-sort payloads, including nested records, strings, IDs, lists, options and results. Equal contributions do not collapse distinct rows. Enumeration correspondence is equality of the complete sequence, rather than just equality of a sum or membership set.

The package uses structural induction, congruence and Boolean case proofs already supported by the kernel. It adds no trusted rewrite, representation law, optimizer catalogue, solver or proof rule to the compiler. Both packages reproduce byte for byte; the earlier whole-row compiler also verifies their complete libraries.

The representation laws now also have a [standalone Lean contribution](../reports/hunchroom-column-layout/README.md), published as [Hunchroom module 151](https://hunchroom.com/modules/151) and checked by Lean and Nanoda. It includes independent row/column write algorithms, arbitrary future histories and a checked decoder with unmatched-lane loss witnesses. This reviewed Lean translation is separate evidence, not automatic Ink/native admission.

## Executed comparisons

The new native comparison test runs eight 64-write histories across the two source schemas, with empty and nonempty starting stores, boundary keys, repeated writes, absent removals and unrelated lookup hints. All 512 prefixes compare the mathematical row and column transitions with an independent `BTreeMap` and four native stores: flat rows, flat columns and both layouts promoting to a tree. That supplies 2,048 native mutation/returned-value comparisons and 6,144 native lookup comparisons, along with complete ordered enumeration and value iteration checks.

Ten fully rehashed false packages are rejected: dropping joined rows, losing values on prepend or overlay, returning a nonmatching lookup and falsely accepting unaligned columns. The tests change definitions and every dependent content identity; rejection is not a stale hash failure.

The generic proof evaluator has a fixed 100,000-step/depth budget. Expanding multiple complete-record writes in one concrete symbolic evaluation hit that limit during development. The universal history theorems check symbolically; every native/model prefix is evaluated through the actual one-step definitions, and concrete two-write replay is additionally checked on stores of at most four entries. The budget is unchanged. This is a proof evaluator limit, not an executed-language storage or history limit.

The full test suite, audit and unchanged benchmark input replay are recorded in `reports/source-column-layout-phase1`.

## Remaining correspondence

Native `OrderedStorage` uses `Vec` and Rust's binary search, with a checked index hint and optional promotion to `BTreeMap`. Those operations are not this linear-search model. The model does not verify binary search, unique sorted keys, native allocation/indexing/moves, promotion, source action/effect execution, cache/journal composition, codecs or snapshot installation. Native comparisons are finite evidence, not a proof of those operations.

Next establish sorted/unique invariants and search/index contracts, connect actual source table transitions and native primitives, then combine layout evidence with cache/undo and complete transaction observations. Database candidate admission must require those connections. No native optimization or new performance claim is made here: the emitted benchmark code and plans remain unchanged.

To reproduce the packages and check source bindings plus both preserved kernels:

```sh
python3 tools/audit_column_layouts.py --reproduce
python3 dev.py test --test source_columns
```
