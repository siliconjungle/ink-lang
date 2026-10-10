# Bounded runtime values and source-bound logic

`SourceValues::bind` takes an opaque `CheckedModule`, a checked maintenance
certificate and a source row model. It reconstructs the expected definitions
through the existing row-model gate before creating a witness with private
fields. Database metadata or a mathematically valid unrelated definition cannot
construct that witness. This introduces value correspondence, not a rewrite law.

The witness encodes and decodes actual `stateful::Value` inhabitants. It checks
nominal record, ID and enum names, exact record field sets and declaration order,
word widths, variant/branch types, typed list members and valid UTF-8 bytes.
An embedded `u32` uses a logical `u64` word but decoding rejects values above
`u32::MAX`. IDs preserve both words of the source's 128-bit value.

Decoding accepts closed canonical constructor values. It rejects variables,
function calls and computed expressions rather than running them as codecs.
An iterative preflight bounds nodes, constructor-identity bytes and depth before
recursive decoding. Encoding checks list/string/unary-integer depth before
expansion. Defaults are 10,000 nodes, depth 128 and 1 MiB of charged value bytes;
hard caps are 100,000 nodes, depth 128 and 16 MiB. These are logical-tree/work
budgets, not serialized JSON byte counts or exact allocation measurements.

`values.table(datatype)` checks a previously verified datatype's complete
`Nil | Cons(key,row,tail)` structure against the source-bound key and row sorts.
It does not recognise a database entry name. Tables preserve strictly increasing
source key order. Both directions reject duplicate or reversed keys; numeric
keys require a zero high word, and nominal keys preserve their source identity.
The returned values can be compared directly with runtime query results.

## Current limits and trust boundary

The current database exact-integer datatype is unary. Large valid Ink integers
may exceed this logical bridge's budget. Refusal does not narrow Ink's `Int`
domain or prohibit ordinary execution: a future transformation must fall back
when it cannot establish its required correspondence. An efficient logical
integer encoding is needed before using this bridge on general production data.
The bounded API is for verification, not a native storage or persistence codec.

The witness still depends on the existing specialised maintenance/source-row
interface. It is a step toward replacing that authority, not evidence that it
has already been removed. Recursive source types and row expressions outside
that model remain unsupported. Proof entries are supplied by the knowledge
repository; no map, filter, join, aggregate or layout optimisation rule was
added to the kernel by this change.

The Rust value encoder/decoder and the existing source-definition translation
remain trusted implementations. Round-trip and differential tests are evidence
about them, not universal mechanised correctness proofs. Checked row/column
mathematics plus these value bindings do not establish that arbitrary native
storage, source actions or effect traces implement the logical machine. The
native emitter, generated runtime, Rust/C and LLVM retain their trust roles.

Next bind actual source operations and action control flow to a transition
interpretation. Check reads/writes, tentative reads, ignored nested errors,
rollback, ordered event publication, commit-counter exhaustion and snapshot
boundaries before admitting a replacement transaction plan. An AST encoding
must be connected to the actual interpreter semantics; syntactic equality with
a database function alone is insufficient.

## Evidence

`tests/row_model.rs` and `tests/source_columns.rs` now use the shared bridge for
actual runtime rows rather than a separate hand-written logical encoder. Their
existing projection, undo, lookup, order, alignment, search and native-storage
checks remain. `tests/source_values.rs` additionally checks 24 reference
transaction prefixes through checked column encode/decode, malformed nominal
and member types, canonical decoding, resource refusal, numeric/full-width ID
keys and source mismatch.

The independently supplied incremental-view entries remain append mathematics.
The join combines matching payloads as `a + b`; negating a payload does not model
a signed deletion. Sum order independence concerns the aggregate observation,
not observable row/event/snapshot ordering. `tests/incremental_views.rs` checks
256 append combinations against direct pair enumeration and rejects a correctly
rehashed false theorem through the ordinary kernel.

See the [original validation](../reports/source-values-phase1/REPORT.md) and
[canonical-store integration](../reports/source-values-canonical/REPORT.md).
The latter rechecks the 55 readdressed entries through the canonical Store and
registry interfaces and independently rejects an authenticated false theorem.
