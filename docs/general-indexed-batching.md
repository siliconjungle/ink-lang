# Typed indexed tables and automatic grouped proposals

`knowledge/producers/generic_indexed.py` composes one indexed physical root per
logical table and proves complete source-action preservation. Row layouts come
from checked datatype constructors, rather than a `value`/Boolean field template.
The admitted serializable rows include U64/U32/I32/F32, Bool, Unit, exact Int,
String, nominal IDs, vectors, lists, options, results, records and enums, including
nested combinations. `examples/general-indexed.ink` exercises those types and two
tables with different row types. Indexed keys include U64, U32, I32, Bool,
UTF-8 strings and nominal 128-bit IDs, using the exact source ordering/equality
definitions. Bounds and routing implications receive ordinary structural and
scalar proofs; a producer declaration is never an ordering assumption.
Temporary Buffer/Map ownership values remain outside persistent row codecs.

Finite recursive nominal records, including mutual recursion through options,
lists, results and vectors, use a source-derived inductive tree carrier. Distinct
nominal tags and structural field adapters preserve their source JSON shapes.
Other wrappers retain ordinary datatypes. The mathematical carrier also has
totalized behavior for invalid encodings; valid source values are checked at
explicit codec boundaries. Source correspondence and host codecs remain trusted
components, separately exercised against the independent reference evaluator.
Portable schemas use lexically bound references with byte/value/depth limits;
references add no wire bytes. Snapshot identities still bind the complete source.

The producer examines typed query subexpressions throughout actions. It proposes
products of independently proved U64 additive and Boolean OR/AND summaries.
An empty-case and inductive step prove each decomposition; singleton evaluation
uses both the actual key and row. Predicates and projections need no special
field names. Separate components of a multi-table query can use separate cached
summaries. Parameterized predicates, coupled table dependencies, floating-point
reductions and other expressions without an admitted decomposition retain exact
source evaluation. Arbitrary predicates do not imply a constant-size summary or
constant-time query. Failed proposals retain the ordinary baseline.

Database grouped traversal laws cover all nine ordered insert/replace/remove pairs.
For keys within a node's range, both edits share a traversal and rebuild metadata
once per parent. The other branch uses the original sequential definitions.
The laws preserve logical rows and cache/range/height metadata for arbitrary
physical roots after repair, including duplicate logical keys. Complete action
proofs additionally preserve intermediate reads, replies, errors, events,
versions and rollback. Insertion-containing pairs share routing and rebuild or
balance the common parent once; rotations still use the existing checked laws.
A virtual greater-key query after removal avoids constructing an intermediate
parent just to choose an insertion branch. Ordered enumeration and duplicate
keys are included in the obligations. Longer actions can use adjacent pairs
wherever the translated typed expression exposes them.

State-threading result carriers receive structural encode/decode adapters and
ordinary round-trip proofs. Pure application values retain their original types.
These definitions live in knowledge. The integrated compiler supplies general String/ID
correspondence and precise closure capture dependencies. Authenticated proof
views allow 8192 objects and 128 MB; representation dependency lists allow 512
entries. Existing proof nesting, descent and term budgets remain enforced.
The sealed definition witness also keeps a private executable declaration index,
avoiding repeated proof parsing during lowering. It is populated only after
admission. Registry admission borrows authenticated JSON through the same
membership and kernel checks, and releases projected transport data before
sealing the public request. This avoids retaining duplicate large proof views;
no proof is skipped. No aggregate or grouping algorithm is recognized by the compiler or
lowerings.

`planner/select_implementation.py` now automatically proposes and checks indexed
and grouped alternatives when no explicit candidate list is supplied. It also
discovers source-bound published candidates. Use `--no-proposals` for published
candidates only; an explicit `--candidates` file preserves the original supplied
pool behavior. The proposal recipe cache binds producer code/data, compiler,
source and budgets. Every candidate package is checked again before selection
and emission. Declined proposals are reported and are not cached as successes.
The bounded proposal subprocess has no dependency on a SAT solver: frozen scalar
certificates remain untrusted data replayed by the ordinary checker.

The existing lifecycle ranker chooses among the baseline, indexed and grouped
packages using exact compiler/backend/workload-bound observations. Setup,
checking, compilation, teardown, action frequencies, portable migration and
measured memory count when the profile requests them. Missing comparable evidence
retains the baseline. A proof that grouping is safe does not establish speed.

`tests/representation_parity.rs` compares complete request histories, snapshots
and outboxes on Rust, C, JavaScript, both Wasm lanes and both GPU host paths.
Recursive physical state runs on GPU hosts. This test does not claim device
execution or a formal proof of the lowerings. The benchmark and automatic
selection reproduction are in `reports/generic-indexed-batching/`.

The wider regression fixture `examples/indexed-key-types.ink` uses six tables,
all six admitted key orders and every ordered edit pair. Recursive direct and
mutual rows are covered by `examples/recursive-indexed.ink`. Their source-bound
catalogue pins and admission receipts live in
`knowledge/research/indexed-extensions/`; requests are reconstructed from
ordinary authenticated store objects, avoiding a repository blob over 100 MB.
The required representation CI shard reauthors these source fixtures and runs
all existing tests; its time allowance is 120 minutes for the expanded workload.
Freshly authenticated insertion routing and string ordering corruptions must
fail mathematical admission.
