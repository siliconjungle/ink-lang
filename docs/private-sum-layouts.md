# Private sum layouts

Physical plans may select `sum_spines`: source `Result<A, Result<B, C>>`
types represented privately by one tag and an opaque leaf payload. The initial
capability handles right-associated spines with 3–65 alternatives. It applies
to immutable first-order values, including recursive finite trees, exact
integers and raw binary32 values. It recognises source types, not JSON names.
Normal source, proof-object and transport resource limits still apply.

`ink emit-sum-codecs SOURCE -o schemas.json` exports fixed source-derived
encode/decode meanings. `ink check-sum-codec SOURCE LAYOUT.json` checks their
exact correspondence and both ordinary, closed equality proofs:
`decode(encode(source)) = source` and `encode(decode(flat)) = flat`.
Knowledge authors those proofs and proposes layouts with
`producers.sum_flatten`; the `private-sum-spines` recipe proposes individual
and combined layouts while retaining existing physical choices. Catalogue
membership and a valid proof do not establish profitability.

The JavaScript backend emits selected constructors, matching, callbacks,
equality, state failure handling, ownership conversion and serialization.
Checked private capture and binary readers can construct a flat cell directly;
owned output and binary writers traverse its leaf directly. They still charge
the original logical nodes and depth and validate the original host shape.
Ordinary public values and portable and compact bytes retain their source shape.
Checkpoint annotations are private and added after logical identities are fixed.
Other targets and definition representations reject this capability explicitly.

An existing private error child retained by a constructor is kept when needed
to reconstruct shared state replies. Flattening is not permission to change
ownership or expose state nodes. The current emitter still creates temporary
one-level views for some source operations and generic public conversions;
this is a remaining backend cost, not a new source meaning.

Proofs establish the fixed value codecs. Backend implementation correctness,
resource accounting, sharing, rollback and byte compatibility remain separate
trusted obligations tested against ordinary emission. The executable fixture
in `knowledge/tests/fixtures/sum_runtime.*` exercises each selected layout and
their combination, mapping between selected and ordinary carriers, destination
calls, exact numbers, recursive leaves, invalid ingress, nested failures,
events, versions, host rollback and exact cross-layout restore.

Layout selection must use comparable lifecycle evidence. Captured private
input, public logical input and JSON text input have different conversion
costs; a win in one does not justify selecting a layout for another.
