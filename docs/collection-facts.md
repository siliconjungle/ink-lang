# Source-derived collection facts

`ink_core::collection_facts` derives bounded advisory facts from the actual
selected typed `Program`, expression and lexical type environment. It consumes
no database annotation, certificate hash or external ownership promise. A
selection changes the expression being analysed, so it cannot inherit facts
from the previous expression.

The analysis records result type, exact length or a conservative length upper
bound, possible borrowed-result origins, free caller captures, fresh/borrowed/
unknown storage, and conservative pure total closure. Lengths use symbolic input
extents, sums, minima and maxima. Maps, indexed maps, scans and sorts preserve
extent; concatenation adds it; zip takes the minimum; filter retains only an
upper bound. Branches retain exact extent only when both symbolic extents agree.
Helper arguments contribute their already inferred facts to a fresh parameter
scope, including through composed calls and local bindings. Lambda parameters
shadow captures. Helpers do not capture a same-named caller local implicitly.
Recursive or unsupported calls, error propagation, temporary mutation, and
exhausted analysis budgets produce unknown facts. Analysis limits are 16,384
visited nodes, depth 16, and eight composed helper frames. Pure totality excludes
resource exhaustion; it is not a proof of emitted machine code.

An explicit-stack node/depth preflight precedes recursive typing and every
helper expansion. Large/deep shapes lose facts before adding a typing traversal
to the active emitter stack.

These facts are **not equality admission authority**. Algebraic rewrites and
work-skipping theorems remain checked database objects. Core primitive meanings
and the proof kernel have not changed. Backends use descriptive facts for resource bounds and explicit destination
placement. They do not infer reusable buffers from immutable list expressions.
Database equalities select explicit owned Buffer operations with fixed semantics.
Any symbolic length consumer reads already materialized arguments rather than
evaluating a source producer again.

A terminal `let` whose remaining tail only passes the same list through alias
binders writes its initializer directly to the caller destination. There is no
intervening scalar computation or callback in this case. The returned logical
count comes from that initializer, never from destination capacity. JavaScript
does not expose destination-backed intermediate arrays to helpers, so an excess
capacity cannot be mistaken for list length. F32 conversion still occurs once
at the terminal store. Other `let` initializers are materialized once as before.

The existing destination ABI trusts sufficient capacity, lifetime and
non-aliasing with every reachable caller input. No caller validation or checker
wrapper is generated. Destination tails remain unwritten; ordinary returned
results remain live and independent of later destination calls. C emission also
supplies these storage changes to the Wasm path that compiles generated C;
other backend emitters must consume the general analysis separately.

Focused tests cover composed helpers, branches, symbolic min/sum/upper bounds,
lexical aliases and shadowing, recursive/unknown/error fallback, wrapping integer
and exact binary32 outputs, borrowed input immutability, shared results,
transitive callback collection reads, excess destination capacity, unwritten
tails and independent result lifetimes. Allocation counters are verification
instrumentation outside timing. They establish fewer allocations in these
cases, not general performance superiority.
