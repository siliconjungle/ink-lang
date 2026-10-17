# Transport complete source-bearing plans

Frozen executable rows already accept typed JSON inputs, including finite JSON
floats and explicit raw-bit values. A complete plan carries the selected source
as well as mathematical knowledge. Applying integer-only knowledge serialization
to that whole packet rejected otherwise valid frozen sources before proof replay.

`planning::canonical` and `planning::identity` serialize and bind complete plans.
They preserve those source values and the existing transport depth bound.
Integer-only historical plans retain their previous bytes and identities.
Plan prefix caching, CLI receipts and compiled artifacts use the same plan
transport. Source identities, original frozen rows and checkpoint namespaces
remain unchanged; no snapshot is rehashed into another source namespace.

Knowledge objects retain `registry::canonical` and its integer-only rule. Every
embedded view still authenticates its objects, checks interfaces, declarations
and types, and replays each proof. A float inserted into a mathematical object
still rejects even though the surrounding source-bearing packet can transport
floats. Plan transport itself grants no equality or applicability authority.

Whole views, selections and complete plans now share a 256 MB aggregate byte
allowance. CLI selection input and trained-artifact proof input use that same
bound. Scoped case premises in complete graph proofs can exceed the former
128 MB view allowance; the earlier 16 MB selection limit also prevented using
views that were individually within their admitted bound. Individual knowledge
entries remain limited to 16 MB and views to 8,192 entries. Existing source,
type, proof work and proof nesting checks continue to apply. The input trace,
source module and checkpoint bounds keep their separate purposes.

Regression checks cover frozen F32 rows with a finite decimal, signed zero and
raw NaN bits; complete source-bound rewrite replay; exact source/frozen-row
preservation; prefix reuse; rejection of floats in knowledge; and historical
integer plan identities. This is transport and admission functionality, not a
new float equation, F64 differentiation capability or runtime performance claim.
