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
and the proof kernel have not changed. Backends use the facts only to place and
reuse storage while executing the literal eager stages in their existing order.
Any symbolic length consumer must read already materialized arguments rather
than evaluate a source producer again.

JavaScript, C and Rust can reuse an unbound fresh temporary as the output of a
map, indexed map, scan, or stable filter when source and result have identical
flat element types.
The complete source stage executes before the consuming stage. Borrowed inputs,
bound/shared receivers, and callback closures with reachable collection captures
are excluded. Helper closure inspection follows their actual definitions; an
unknown helper cannot authorize reuse. Unsupported element layouts, zips, and
sorts retain their existing output allocation. This is conservative:
a capture of a disjoint list also prevents reuse in the current implementation.

Eligible fresh receivers of length-preserving consumers can also execute into
caller storage before their consumer updates that prefix in place. A filter
destination only needs capacity for its final result: the larger receiver is
materialized privately, then its kept prefix is written to the destination.
Ordinary filters compact their eligible private receiver in stable source order.
C retains the returned list count;
JavaScript retains the receiver Into count explicitly. Conversion-free
JavaScript paths support this placement; F32/Int output conversion keeps the
ordinary temporary, so internal bit representations cannot be confused with
external destination values.

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
Rust reads lexical list bindings through borrowed iterators for maps, filters,
indexed maps, scans, zips and ordered reductions, avoiding a whole-vector clone.
Computed receivers finish eagerly before traversal; returned values still own
their storage. GPU executes its literal resident stages under its existing
capability and numerical contract; unsupported stages retain CPU fallback.

Focused tests cover composed helpers, branches, symbolic min/sum/upper bounds,
lexical aliases and shadowing, recursive/unknown/error fallback, wrapping integer
and exact binary32 outputs, borrowed input immutability, shared results,
transitive callback collection reads, excess destination capacity, unwritten
tails and independent result lifetimes. Allocation counters are verification
instrumentation outside timing. They establish fewer allocations in these
cases, not general performance superiority.
