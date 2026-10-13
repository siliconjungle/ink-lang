# Private record layouts

A physical plan can select `record_elisions`, a sorted list of source record
names with database bundles and two theorem roots (`roundtrip`, `inverse`). A
selected record has exactly one immutable first-order field. The JavaScript
backend stores that field directly, removing the wrapper allocation. The source
program, public values, typed wire descriptors and portable checkpoint bytes keep
their original record shape.

`ink emit-record-codec SOURCE --entry RECORD -o codec.json` exports fixed codec
meanings. It uses the existing source value domain, independently of whole-action
projection: unbounded UTF-8 strings and exact integers remain inductive values;
recursive source values use the existing finite tree carrier. The projection is a
superdomain of valid source values; bounds and profiles never narrow the payload.
The exported constructor, projection and reconstruction leave the payload intact.
Core reconstructs those declarations from the actual checked source and checks
both `decode(encode(wrapped)) = wrapped` and
`encode(decode(payload)) = payload` using ordinary closed equality proofs. It does
not author a proof or infer profitable sites. Missing, conditional, mismatched,
rehashed-invalid or stale-source evidence cannot select a layout.

The knowledge producer `producers.record_elision` authors case/conversion proofs
and proposes individual and combined sites. Its recipe is published in the
knowledge registry, so automatic JavaScript planning discovers the family without
new planner dispatch. It preserves existing physical choices when proposing an
alternative. Comparable lifecycle evidence is still necessary to prefer it over
the baseline. It is not automatically enabled merely because a proof exists.

Literal lowering handles constructors, field projection, typed equality, pure
callbacks, state input capture, public outputs and destination calls. Lexically
unused projected inputs still avoid field reads. Capture validates the original
host shape and charges the original logical nodes/depth, in the same order.
Public mutable replies own their containers. Internal aliases require schema
specific output memo keys, so an elided parent and its child cannot collide.
Owned pure calls copy from their private result directly, retaining logical wire
resource charges and avoiding an intermediate public conversion.

Checkpoint descriptors receive private traversal annotations after the original
program/schema identities have been computed. Encoding and decoding still charge
record nodes and emit exactly the original logical bytes. Restore builds the
selected carrier directly; snapshots migrate in both directions between ordinary
and selected JavaScript implementations. Transactions retain their existing
rollback, version and event machinery. Maintained-fold field adapters read the
selected carrier literally, and dense table prefixes can compose with the layout.
Unsupported target selections fail explicitly; this initial capability is
JavaScript only. It does not add a primitive or change executable-core semantics.

Correctness of the source correspondence, emitted storage/conversion/checkpoint
code, JavaScript engine and host remains a separate trusted obligation. Codec
proofs do not prove backend machine code. Conformance covers recursive enums,
nested wrappers, shared child values, `__proto__`, exact Int, raw float bits in
both storage modes, public ownership, capture read order and budgets, binary and
compact calls, destination tails, events, rollback and exact cross-layout restore.
The required JSON/state suites also cover the existing C/Rust/JS/both-Wasm and
GPU host observations; they do not imply arbitrary real-device JSON support.

This is the first compiled private-layout capability. Flattened sums, packed tag
words, flat record sequences and guarded dictionaries remain separate work. The
previous layout-only prototypes do not establish compiled performance for those
representations. General arbitrary JSON snapshot diff also remains a capability
gap in the Frontier comparison.
