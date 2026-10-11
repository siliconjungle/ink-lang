# Knowledge-defined chunks, bulk loops and incremental compilation

Ink's syntax is unchanged. Layouts, loop rewrites and maintenance recipes are
ordinary independently checked knowledge objects. A profile proposes a candidate;
it supplies neither correctness assumptions nor permission to reorder effects.

## Physical collections and dynamic keys

`knowledge/producers/packed_tables.py` builds a family of recursive table datatypes
with one to four inline key/value pairs per chunk. The current frozen source-bound
candidates use widths two and four. Lookup scans a chunk in row order, replacement
updates every matching key, removal removes every matching key, and insertion
preserves the source table's existing insertion behaviour even on unsorted lists
with duplicates. Proofs cover arbitrary chunk boundaries, not only values produced
by the encoder. Native emitters store the declared fields literally; this is not a
new generic representation interpreter.

`packed_representations.py` translates whole actions and proves their complete
source observations, future-state relations, initialisation and portable decoding.
Rollback, host failure, version exhaustion, query replies and events remain part
of those obligations. Unsupported source shapes fail closed. The initial authoring
budget supports state roots that are admitted tables and ordinary projected actions;
helpers returning tables and direct matches on their changed physical carrier need
additional authoring work.

`indexed_tables.py` can wrap any such layout with auxiliary Option values for one
to eight supplied u64 keys. Queries still accept a **dynamic key**: indexed keys
use their checked auxiliary value, and other keys use the underlying lookup.
The relation also proves that auxiliary values are fresh. Keys may be absent, rows
may contain duplicates, and no uniqueness or sortedness premise is introduced.
Writes currently refresh the small auxiliary set from the updated chunks.

These are profile-specific hot-key indexes, not a general hash table or B-tree.
They trade reads for extra maintenance. The full observation adapter may also
materialise logical rows when publishing an action result; lookup complexity alone
is therefore insufficient to predict complete-call cost. Benchmark the emitted
program and keep the direct baseline when it wins. Frozen replayable requests and
layout audit metadata live in `knowledge/research/storage-bulk`.

Example authoring (the supplied key is an untrusted workload proposal):

```sh
ink emit-action-model app.ink -o model.json
PYTHONPATH=knowledge python3 -m producers.packed_representations model.json \
  --width 4 --hot-key 1023 --compiler ./target/debug/ink -o request.json
ink check-representation app.ink request.json
ink emit-representation app.ink request.json --target rust-wasm -o compiled
```

## Bulk updates inferred from functions

The installed `bulk_collection_laws` producer recognises two pure right-fold
shapes: singleton-prepend construction becomes map plus one concat; repeated
singleton append becomes one owned buffer, repeated push and one freeze. An
arbitrary existing suffix is retained. The right fold's order is preserved, so
append emits the reverse traversal after the suffix. The mapped item must be
independent of the accumulator; an accumulator-dependent loop is left unchanged.

The canonical family contains 128 checked laws across eight admitted element and
result carriers. Source-specific specialisation binds nominal types and helper
functions using the existing definition-context contract. Events and transactional
writes cannot occur inside these pure callbacks. These laws do not combine
arbitrary adjacent state writes or reorder observable intermediate reads.

The fixed semantic denotation now describes buffer mutations on opaque buffer
values through their frozen sequence, allowing induction over an owned loop
accumulator. This adds no primitive, parser form, target pattern or new proof rule.
The independently implemented evaluator and existing native buffer support are
unchanged. Arithmetic is not reassociated; moving binary32 values preserves bits.

## More incremental queries

The existing aggregate representation producer now proposes Boolean OR/AND
maintenance as well as the existing word sum/count families. A universal fusion
proof must show the query is a fold of singleton row contributions with the
appropriate identity. A Boolean empty result alone is insufficient: for example,
parity is not admitted as OR maintenance. Contributions may depend on both key
and value.

Insertion combines the old aggregate with the inserted row contribution. Removal
and replacement refresh from the logical post-state; aborts and host failures
retain the previous cached value. Any/all are not invertible, so deleting a witness
cannot simply subtract a Boolean. The initial authoring tactic supports one table.
More reducers, richer indexes and cheaper refresh paths remain further candidates.

## Reusing compiler work

A `selection-session` can admit another authenticated closure from the same exact
snapshot. Previously sealed semantic proofs are reused only against the same
executable module. New bytes, membership and closure completeness are checked;
applicability is checked again. Failed admissions leave the old session intact.
The planner reuses admitted supersets and overlaps, retaining bounded session,
entry and byte limits. A union exceeding capacity starts a separately bounded
session instead of rejecting an otherwise valid closure.

`planner/plan.py --cache-dir DIRECTORY` optionally persists untrusted search
results. Its key hashes the compiler executable, exact core and base snapshot,
planner/knowledge/producer source and packaged proof data, cost model, search
budget/rounds, Python version, and optional `--cache-context FILE` bytes. Put target,
toolchain and workload/profile information in that context when it affects planning.
The distribution forwards `ink build ... --optimise knowledge --plan-cache DIRECTORY`
and optional `--plan-cache-context FILE` to this planner. Specialisation may derive
another immutable catalogue; its complete selected
closure travels with the cached result. Every hit runs fresh `check-selection`
proof replay. Invalid hints fall back to search. The cache is atomic and bounded
to 256 files of at most 16 MB. It avoids discovery and search, not final proof
checking, backend emission or machine compilation.

## Incremental knowledge discovery

Publication now uses stable hash-prefix Merkle buckets instead of fixed sorted
64-entry slices. Within a topology tier, insertions change local buckets and their
paths; overflow splits locally. Topology doubles at size thresholds, where broad
churn is still expected. Node, snapshot and membership formats are unchanged and
historical pins remain readable. Full publication still validates all supplied
entries; this is not an append-only publication API.

`Store.refresh_index()` copies the disposable SQLite index, parses only previously
unindexed canonical entries, authenticates the new tree, retains historical
membership rows and adds new observations, then replaces the index atomically.
`rebuild()` remains the repair path. Reused discovery rows never become proof
receipts: exporting a bundle rereads and hashes canonical objects and verifies
membership witnesses. Concurrent disposable-index writers are not merged by the
refresh operation; canonical observations remain recoverable by rebuild.

## Validation and measurements

`tests/packed_tables.rs` compares arbitrary duplicate/unsorted rows and noncanonical
chunking with an independent vector oracle. Standalone histories compare native
Rust/C, JavaScript, both Wasm routes and both GPU host routes against the source,
including exact portable snapshots, events, rollback, restore and exhaustion.
Portable histories switch between direct, packed and indexed states with pending
events. The pure bulk suite also executes eligible GPU work.

Index tests cover local publication churn, skewed bucket overflow, growth tiers,
historical pins, only-new-entry parsing, atomic failure and tampered canonical
bytes. Proof-session tests cover authenticated overlap, idempotence and rejected
admissions. Cache tests cover explicit input invalidation, malformed hints and
bounded eviction. Existing primitive/proof and planner suites are rerun.

Reproducible reports and commands are in
[`reports/storage-bulk-incremental`](../reports/storage-bulk-incremental/README.md).
Correctness tests do not prove backend correctness or performance. Timings are
machine-specific; allocation requests are measured in separate instrumented builds
and are not peak or retained memory. Complete action costs, checking, emission,
native build, search replay and publication are reported separately.
