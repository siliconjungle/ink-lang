# Transport complete source-bearing plans

Frozen executable rows already accept typed JSON inputs, including finite JSON
floats and explicit raw-bit values. A complete plan carries the selected source
as well as mathematical knowledge. Applying integer-only knowledge serialization
to that whole packet rejected otherwise valid frozen sources before proof replay.

`planning::canonical` and `planning::identity` serialize and bind complete plans.
They preserve those source values with a separate bound for the complete envelope.
Integer-only historical plans retain their previous bytes and identities.
Plan prefix caching, CLI receipts and compiled artifacts use the same plan
transport. Source identities, original frozen rows and checkpoint namespaces
remain unchanged; no snapshot is rehashed into another source namespace.

Knowledge objects retain `registry::canonical` and its integer-only rule. Every
embedded view still authenticates its objects, checks interfaces, declarations
and types, and replays each proof. A float inserted into a mathematical object
still rejects even though the surrounding source-bearing packet can transport
floats. Plan transport itself grants no equality or applicability authority.

Whole views, selections and complete plans now share a 512 MB aggregate byte
allowance. CLI selection input and trained-artifact proof input use that same
bound. The actual authored network's factored view exceeds 256 MB even with
explicit immediate selector steps. The finite aggregate allowance accommodates
those individually checked equations and their source-bearing plan; it does
not increase any individual theorem's work or nesting budget. Scoped case
premises in complete graph proofs can exceed the former
128 MB view allowance; the earlier 16 MB selection limit also prevented using
views that were individually within their admitted bound. Individual knowledge
entries remain limited to 16 MB and views to 16,384 entries. Existing source,
type, proof work and proof nesting checks continue to apply. The input trace,
source module and checkpoint bounds keep their separate purposes.

Regression checks cover frozen F32 rows with a finite decimal, signed zero and
raw NaN bits; complete source-bound rewrite replay; exact source/frozen-row
preservation; prefix reuse; rejection of floats in knowledge; and historical
integer plan identities. This is transport and admission functionality, not a
new float equation, F64 differentiation capability or runtime performance claim.

Complete envelopes are scanned iteratively before parsing and may nest at most
256 containers. Individually deserialized knowledge payloads, interface values
and selected source values retain their independent 128-level JSON field budget.
An envelope therefore does not consume the nesting allowance of an otherwise
valid embedded object. The decoder preserves ordinary literal JSON keys, rejects
trailing bytes and keeps the aggregate byte check before allocation. Compiled
plans, standalone selections, knowledge views and trained proof artifacts use the
same bounded entry points. Pure-function replacement compares full source bytes
with source serialization, so unchanged finite frozen floats remain admissible.

Regressions also replay a deep payload inside an action plan that exceeded the
former envelope parser limit, reject overdeep fields and envelopes, preserve a
literal serde private-token key, and bind explicitly supplied request fields in
streaming receipts. All mathematical canonicalization and replay checks remain
mandatory. These are parsing and source-correspondence checks, not profitability
or compiled runtime speed measurements.

The entry ceiling accommodates more individually bounded lemmas when a larger
application proof is factored. The selected full-network authoring attempt
exceeded the former 8,192-entry closure limit. This changes packet capacity,
not per-theorem work, typing, termination, or replacement authority. Every
entry must still authenticate and replay under the existing limits.
