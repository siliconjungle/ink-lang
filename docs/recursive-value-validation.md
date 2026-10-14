# Recursive value validation (staging)

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

Semantic normalization unfolds a named definition once along an open symbolic
path. Closed arguments can continue bounded computation. Remaining symbolic
recursive calls keep their original meanings; stopping expansion grants neither
an equality nor an invariant. This prevents an unknown finite tree from creating
an infinite proof-normalization expansion.

Initial structural-component tests passed. The recursive raw-validator test
passed for a record/list tree and an Option cycle, including invalid descendants
and altered validator bodies. Broader runs were interrupted by concurrent disk
cleanup, which terminated Cargo processes. Updated field-observation and
normalization changes still need a completed regression run.

`knowledge/libraries/checked-trees.ink` and its imported fixture are authoring
probes pending admission and complete CPU/Wasm conformance. Source/action
correspondence for recursive validators, recursive codec/induction proofs,
restoration and performance evidence remain required. This file records work in
staging, not completion or a published capability.
