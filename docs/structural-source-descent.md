# Structural source traversal

Source recursion can descend through immutable finite values. Record fields are
proper subvalues. Option/Result fold payloads and elements of a rooted list are
proper subvalues as well. Lexical aliases preserve this relation; reconstructing
a value, an opaque helper result, a loop accumulator or a mixture with an ancestor
does not establish it. Every recursive call must descend from the same entry
parameter. Shadowed variables receive fresh scoped meanings.

This is a general totality check over actual source structure, with no datatype
or algorithm names in the checker. Source typing and ownership still run first.
The existing finite recursive record/sum encoding and host resource limits remain
in place. Unknown callback domains cannot create a descent relation; their bodies
are still visited so recursive calls cannot disappear from the check. Mutual
recursion continues to reject. The walker bounds depth to 128 and work to 50,000
nodes per attempted root. Existing guarded unsigned/list and lexicographic
descent forms continue to work.

`knowledge/libraries/recursive-trees.ink` supplies a generic recursive tree,
ordered leaf traversal, leaf count and mirroring as ordinary source. The imported
fixture specializes String and u32 payloads and preserves empty branches, nested
order, wrapping values, state updates, events and rollback. Ten replies and exact
snapshots match C, Rust, JavaScript, both Wasm implementations and the wgpu CPU
host; one unrelated eligible numerical control dispatches on the GPU. Core tests
also execute a recursive record/list sum and an Option-linked chain, and reject
ancestor calls, reconstructed parents, unknown iteration inputs and unchanged
calls hidden beside valid descending calls.

This extends trusted totality checking. It does not give recursive source helpers
an automatic mathematical induction theorem. General traversal correspondence,
source datatype induction authoring, recursive refined-value validators, mutual
recursion and recursive physical codec proofs remain required. The first-order
inductive carrier and existing source codecs do not close those proof gates just
because execution agrees on tested inputs.
