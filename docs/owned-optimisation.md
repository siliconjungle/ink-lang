# Owned collections in database optimisation

Ink syntax and ownership rules are unchanged. Fixed logical correspondence now
covers existing Buffer construction, fill, set, swap, push, pop, truncate, freeze,
length and lazy indexed reads; Map empty, set, remove, length, contains, lazy reads,
ordered keys and values; and bounded stopping loops with owned accumulators.
Buffers denote sequences. Maps denote unique ordered key/value collections, with
upsert and absent-removal semantics. Bool orders false before true; i32 key order
is signed. Out-of-bounds edits and empty pop preserve the source behavior.

`core/src/owned_semantic.rs` implements these primitive meanings. Its structural
list helpers are proof vocabulary and cannot become executable source calls.
The fixed correspondence relies on checked affine ownership: source programs
cannot observe allocation identity or aliases. It adds no proof rule or source
primitive. General scalar self-equality computation covers words and Bool;
f32 is excluded because NaN is not reflexive. NaN payloads and signed zero survive
collection operations. Exceptional float computation remains fail-closed.

`ink-knowledge/producers/owned_collection_laws.py` publishes 215 ordinary equality
laws, including map reads/presence after set/remove, binder-shaped versions for
source rebinding, buffer push length, zero-step owned loops, and unused pure
owner bindings. These laws use Normalize, list induction and Bool cases. They are
untrusted until the checker authenticates and checks their complete proofs.
Discovery uses existing typed operation indices and bounded semantic search;
there is no map-specific compiler rewrite or backend optimisation pass.

`examples/owned-collection-optimisation.ink` and `tests/owned_optimisation.rs`
exercise selected map reads, presence, removal, length and stopping. Selected
programs execute through C, Rust, JavaScript and both Wasm paths and match
reference values and exact snapshots. False, content-rehashed updates are rejected.
Core tests cover bounds, empty collections, overwrite/removal, key ordering,
owned iteration and float bits. Rust literal emission annotates typed lets so
unused polymorphic empty constructors still compile.

The proof domain concerns total result values, not fuel, allocation failure,
host traps or latency. Native emission and toolchains remain trusted. These
proofs do not establish heap algorithms, path-finding correctness or arbitrary
persistent-table updates. Stateful physical representations use their separate
all-action preservation contract.
