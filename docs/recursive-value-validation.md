# Recursive value validation

Recursive nominal types containing refinements need finite raw validators rather
than recursive expansion of their field types. The generated validator checks a
record's own predicate and every actual nested field. List validators use their
existing ordered fold. Option and Result validators visit only the selected
payload. A validator has no inferred input invariant: it must reject invalid
values rather than assume validity. Admission reconstructs its entire body and
type coverage, so replacing a generated body with `true` rejects.

Public signatures expose the first record's field guarantees as well as the
recursive child validators. This keeps a payload observation usable under its
actual input contract without expanding the complete recursive type graph.

The source checker derives strongly connected function components. A component
may recurse only if every internal call uses a proper immutable subvalue of the
caller's selected structural parameter. Parameter positions and types can differ
between functions. Fields, selected variant payloads and collection elements
establish descent; reconstructed values, accumulators, ancestors and opaque
helper outputs cannot. Search and graph traversal have explicit work/depth limits.
This rule does not admit mutually recursive unsigned measures.

Semantic normalization keeps recursive calls opaque on open symbolic arguments.
Exact premises and one-step defining equations remain usable. Closed arguments
can continue bounded computation. Remaining symbolic calls keep their original
meanings; stopping expansion grants neither an equality nor an invariant. This
prevents an unknown finite tree from creating an infinite proof expansion. A
single equality check shares its derived function graph across normalization.

Portable definition contexts bind every recursive component's complete member
bodies and external dependencies under `ink-recursive-definitions-v1`. Internal
callee references use the group identity; each member still has its own content
hash. Core reconstructs and type-checks the functions, proves structural descent,
and requires exact actual call components. Missing members, altered groups and
completely rehashed non-decreasing cycles reject. A group identity is a source
binding, not an equality proof. Empty group metadata is omitted, preserving
existing acyclic context identities.

`knowledge/libraries/checked-trees.ink` supplies an abstract generic tree with
unique payload interfaces, construction, observations and immutable replacements.
Its imported String, U32 and record instances pass 17 complete C/Rust/JavaScript/
both-Wasm/wgpu-host cases, including invalid grandchildren and a real numeric GPU
control. Numerical/text and sorted-table regressions also pass. The updated full
core suite passes 300 tests. Rust/Python portable bindings agree; all 72 pure
interface obligations replay through 53 canonical objects, including independent
replay against an unrelated source context. See the canonical publication receipt
in `docs/evidence/general-machinery/recursive-value-validation.json`.

Source/action correspondence for recursive validators, recursive codec/induction
proofs, restoration and performance evidence remain required. These pure ingress
and interface capabilities do not complete the full implementation programme.
