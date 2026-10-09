# Compact storage and ownership lowering

Ink can now compile a Table into contiguous row or column buffers through an external storage policy. It also moves new rows into storage, moves previous rows into undo, and copies a removed row only when the source uses the returned value. This is the first implementation step toward the memory-model advantages described by [Goose](https://github.com/aardappel/goose/blob/master/bench/design.md).

## Physical layouts

The default remains Rust BTreeMap. A policy can select either:

- `InlineRows`: one sorted `Vec<(Key, Row)>`, with no allocation or pointer per table entry.
- `Columns`: one sorted key vector and one row vector, removing padding between keys and rows and letting searches touch only keys.

Both preserve unique ascending keys and the existing ordered `get`, `contains`, `insert`, `replace`, `remove`, `values`, checkpoint and restore behavior. Binary search finds a row. A checked index hint reuses a recent search for a subsequent write only when the current key at that index still equals the requested key. Insertions and removals invalidate the hint; a mismatching hint always falls back to a search. It is an index, not a retained raw pointer into a vector. Changing or growing a vector cannot leave a dangling reference.

Insertion/removal shifts contiguous buffers. This can be expensive for a large mutation-heavy table. `promote_at` optionally changes the table to BTreeMap when a new insertion would exceed the stated row count. Promotion moves the actual keys and values into the tree; replacement of an existing row does not trigger it. The table stays a tree afterward. There is no hidden compiler threshold or measured automatic selector. The database policy supplies the threshold; `null` keeps the table contiguous.

For 4,096 entries with u64 keys and u32 rows, row buffers reserve 65,536 bytes and column buffers 49,152 bytes. That is 25% less buffer space, not a claim about total program RSS or all allocations. String, BigInt, Vec and nested variable-size row fields still have their ordinary Rust allocations. These layouts are not Goose's general inline variable-size values or an allocator-free language.

## Database policies and checking

`knowledge/storage` has four independently selectable policies for the inventory example: row/column layouts, with either a 256-row promotion threshold or no promotion. They work under one compiler. Each pins the exact maintenance certificate identity; changing that certificate requires explicitly updating the policy. The CLI checks the schema, semantic version, table names, threshold bounds and maintenance identity. Unknown fields and arbitrary executable code are rejected. The emitted plan records the entire policy and its byte hash.

```sh
python3 dev.py build --release
target/release/ink emit-state examples/state-benchmark.lang \
  --maintenance knowledge/table-maintenance/table.json \
  --bounded-totals \
  --storage knowledge/storage/inventory-columns-small.json \
  -o build/column-program
```

This is typed policy selection over trusted backend primitives. **It is not database-proved physical refinement.** The current database proofs cover actual cache arithmetic and every finite keyed contribution-write history. They do not prove the implementation of binary search, vector shifts, promotion, native row projection, undo scheduling, effects or the Rust/LLVM backend. The generic proof checker is unchanged. Physical admission/refinement still needs the future-update and rejection obligations described in the Hunchroom review. Backend primitives and language-level optimisation rules must not be conflated: the latter still belong in the checked database, and migration away from legacy compiler recognisers remains unfinished.

## Ownership

The generated setter evaluates pure row-local contributions, consumes the new row into the map and consumes the returned previous row into undo. Insert/replace have a Unit result and need no second previous-row owner. A remove expression whose result is used retains an independent copy alongside undo, preserving abort and return semantics; a directly discarded remove avoids that copy. This changes ownership lowering, not the source expression tree or a cache arithmetic law.

Separate instrumentation uses a row containing a String and a 512-bit signed integer. Creation, replacement and discarded removal/rollback do not clone the whole row in the setter. A successful used remove requires one row copy, because the returned value and the undo entry must both exist until commit. The source/reference/native results still agree. Instrumented binaries are not used for timing.

## Borrowed outcomes

Generated native hosts can call `invoke_view_l_ACTION(...)` to borrow the newly committed event slice directly from State. The result, commit flag and version are unchanged. Rust prevents mutation of State while a live view is used. `invoke_l_ACTION(...)` still returns an independent owned outcome; `into_owned()` explicitly copies the events when that ownership is needed. JSON invocation serialises the view directly, although JSON output still allocates. This is a native host API, not general Ink lifetime inference.

Commit drains staged events directly into the existing outbox. Abort still rolls back and returns no events; exhausted commit counters still roll back and report the same error. Separate allocator instrumentation observes zero allocations for a warmed bounded restock through the view, versus one through the owned API. Buffer growth, initial construction, exact-integer queries and JSON are outside that zero-allocation case. A negative compilation test confirms that mutating State with a live event view is rejected.

## Validation and measured comparison

[The controlled report](../reports/ordered-storage-phase1/REPORT.md) compares the preserved original compiler, current tree lowering, four Ink policies, C, C++ and handwritten Rust with tree and matching contiguous layouts. Every implementation maintains the total incrementally and exposes the same outcomes, versions, ordered events and rows. Rust layout controls use these same storage primitives with handwritten validate-before-mutation actions, making the remaining transaction/compiler cost visible.

The [borrowed-outcome report](../reports/borrowed-outcomes-phase1/REPORT.md) isolates the subsequent view change against the saved storage compiler: 1,764 timed samples, 28,070 independent native observations and 4,010 reference outcomes. Views improve the tree by 1.14×, small-column policy by 1.22× and permanent columns by 1.39× across the matrix. The small-column policy takes 0.734× Rust tree time across the six 64-row cases (about 27% less time), and 1.281× Rust tree time across all 18 cases. Handwritten Rust with the same small-column primitive remains faster: Ink takes 1.570× its time overall.

A 64-row steady update is 9.9 ns for Ink columns, 20.2 ns for Rust tree and 6.6 ns for matching-layout Rust. These are workload results, not language-wide rankings. Permanent columns reach 13.7 ns versus Rust tree's 37.3 ns on a 4,096-row steady stream, but take 364.4 ns versus 61.9 ns on a 65,536-row mixed stream. No flat policy should be treated as a universal winner. Setup/teardown and steady retained-memory measurements remain future work; large states cross the small policy's promotion threshold during untimed initialization.

All 75 tests pass. The full suite covers reference/native transactions, signed exact values, repeated writes, aborts, tentative reads, event order, commit exhaustion, portable snapshots and continued execution. Additional storage oracles exercise vector shifts, stale hints, mutable access, high-word-distinct 128-bit keys, string keys, non-Clone values, replacements at the promotion boundary and promotion itself. Snapshot bytes remain logical and independent of layout; these are not zero-copy physical snapshots or durable recovery proofs.

[Stateful Wasm validation](../reports/compact-state-wasm-phase1/verification.json) covers six generated tree/row/column programs with exact and bounded totals. Each passes in Node and an actual browser, with 29,395 checks per environment including codec checks, plus 3,030 native outcome checks. Cross-layout logical snapshots restore and continue correctly. These are functional checks, not Wasm timings or physical refinement proofs.

## Remaining memory-model work

The complete design still needs general lifetime/ownership inference and region arenas, compact relative graph links, variable-size inline strings/collections/enums, construction directly into final destinations across calls, physical snapshot admission, database-proved representations and bounded measured selection. Simply packing every struct is not the plan: unaligned data can lose vectorization, and larger mixed workloads can favor trees over flat buffers. Each candidate needs correctness evidence, matching algorithm/layout controls, construction/teardown and retained-memory measurements in addition to steady execution timing. The full language and benchmark requirements in PLAN.md remain active.
