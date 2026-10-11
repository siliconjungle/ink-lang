# Path-local indexed tables

Ink knowledge now contains two additional source-bound sequence-tree candidates
for the filtered-aggregate example. One caches a wrapping `u64` sum; the other
caches an active-row count. They retain exact logical row order and duplicate-key
behaviour: lookup returns the first match, insertion precedes the first greater
key, and replacement/removal affect every matching key. They do not assume sorted
unique inputs. Other queries remain available through logical decoding.

The database defines range summaries, cached contributions, balancing, joins,
lookup, insertion, replacement and removal. Removal rejoins surviving subtrees
rather than accumulating empty historical branches. Ordered inputs permit range
pruning; overlapping ranges in arbitrary input orders can require a full traversal.
Finite independent histories check height/balance, while universal equality proofs
establish source/action correspondence, initialization, logical snapshots,
rollback, wrapping arithmetic and migration. Height is not a premise of logical
correspondence. These proofs do not establish a universal logarithmic cost bound.

`knowledge/producers/source_sequence_tree.py` is an untrusted proof author.
The frozen requests and replay receipts live in
`knowledge/research/indexed-sequence`. Admission uses ordinary constructor cases,
induction, substitution, equality conversion and checked word certificates. No
compiler rule recognises an indexed table or trusts a candidate name.

Actions may additionally supply a compact observer with its own ordinary proof.
Core checks that it projects the complete existing observation to reply, commit,
version and events (or the existing host-failure observation). The full action
preservation, logical observation and snapshot obligations still apply. Literal
hosts use that observer to avoid computing a logical state that the public call
does not consume; checkpoints still use the separately proved decode function.
Legacy observers retain the existing general demand projection.

Typed Rust functions carry borrowed shared owners through calls. Reconstructing
an existing immutable edge clones its `Arc`, without allocating another shallow
node. A borrowed root without an owner retains the existing shallow-copy fallback.
The standalone C ABI keeps its separate typed borrowing contract.

Checked functions with up to 64 recursive call sites use explicit typed
continuation frames in the Rust and standalone C lowerings. Descent records call
arguments, and unwinding resumes the checked expression with the recursive result.
A frame retains completed recursive results and its pending call site.
Frames may recompute pure terms before a call; this is general control-flow
lowering, not an optimisation equation. Rust frames and C frame storage cap at
one million frames and 64 MB. C uses generated native-support allocation routines,
including on Wasm. Functions with more call sites retain their existing execution
strategy. JavaScript uses its existing explicit continuation executor. Long-list
support does not imply unrestricted recursion or a proof of backend/resource-failure
correctness. A typed Rust test covers 100,000-row conditional filtering, encode/decode and release.

The Wasm host decodes response bytes synchronously before freeing the guest
buffer, so responses avoid a second byte allocation. Portable snapshots still
return independently owned bytes. Its exact JSON reader avoids temporary token
arrays and native parsing of unescaped strings, while preserving arbitrary-size
integer tokens, finite floating values, safe object keys and the 128-level nesting
limit. Tests cover malformed input, memory growth, buffer release and snapshot
ownership. This is transport machinery shared by both Wasm backends.

Published implementation candidates can contain `knowledge_ref` (schema 1 and
sorted dependency roots) instead of embedding a second copy of the full proof
view. The planner authenticates the candidate and reconstructs its complete view
from the pinned snapshot, then replays the ordinary checker before selection and
again before emission. References, membership and measurements grant no proof
authority. Inline packages remain supported. Append publication reuses old
content references and refreshes the disposable index incrementally; retrieval
still hashes every requested object and validates pinned membership.

Active proof views are bounded to 4,096 entries and 64 MB; individual canonical
entries are bounded to 16 MB. These limits match the Python database and Rust
checker/transport. An authoring rebinder changes an outer source identity only
when every fixed source entry is byte-identical, and writes the result only after
complete checker replay. It cannot adapt proofs to changed program semantics.

See the [paired benchmark record](../reports/indexed-tables-2026-10-12/README.md).
Checking, emission/build, initialization and portable migration are separate from
steady-state calls. Allocation instrumentation uses a separate binary. All seven
standalone target routes must pass the same source-oracle histories; recursive
physical representations remain host work on GPU routes.
