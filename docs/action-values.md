# General action-value correspondence

`ink-core::action_values::ActionValues` binds values to the complete checked
source and typed actions. It does not depend on the legacy aggregate certificate
or row model. The independent producer is
`ink-knowledge/producers/action_values.py`; it writes individual immutable
entries and a per-program view. The shared catalogue is not changed.

Binding authenticates the view, binds the complete source image through
`BoundSyntax`, and compares three carrier definitions exactly. Renaming a
constructor, supplying another checked program or hiding the carrier root fails.
General kernel typing or a content hash alone does not establish correspondence.
The producer is untrusted; the fixed codec and source checker remain trusted.

## Representation

A value is `Value(Nodes, root)`. `Nodes` is a balanced ordered tree containing a
flat postorder sequence of `Node` values. The root is the final node. Some, Ok and
Err contain one backwards child reference. Records and lists contain ordered
child references in the already-bound balanced Words datatype. Every child node
is consumed exactly once; shared, forward, missing and unused references fail.
Decoding re-encodes and compares the whole image, rejecting alternate node order.
This represents an owned value tree, not an arbitrary cyclic or shared graph.

Node constructors are Unit, Bool, U32, U64, Integer, String, Id, Enum, Record,
None, Some, Ok, Err and List. U32 is checked for its actual width. There is no
implicit U64-to-U32 coercion. IDs preserve both halves of their 128-bit value.
Nominal indices use sorted type names within their separate ID, enum and record
categories; enum variants and record fields retain declaration order. The fixed
ArithmeticError.Overflow intermediate occupies the index after source enums.
Its name is reserved by ordinary action admission.

Exact integers use a sign, byte count and unsigned little-endian binary magnitude.
Zero has no magnitude bytes and is never negative; redundant high zero bytes
fail. Strings contain exact UTF-8 bytes and their length. Bytes are packed into
little-endian U64 chunks, with zero padding in the last chunk. Invalid UTF-8,
extra words, incorrect lengths and nonzero padding fail. This supports large
integers without unary expansion; it does not yet supply arithmetic proofs over
those integers.

The value domain is the current executable action subset: Unit, Bool, U32, U64,
Int, String, nominal IDs/enums/records and recursive List/Option/Result. Unknown,
I32, F32, Vector and Table types are rejected, including when hidden behind an
empty option or collection. Table is a root capability, not an ordinary value.
This codec does not expand the language's accepted action types.

The caller can lower the existing value limits. Hard ceilings remain 100,000
terms, depth 128 and 16 MiB of charged datatype/primitive bytes. CLI defaults are
10,000 terms, depth 128 and 1 MiB. The canonical database JSON depth limit also
applies. Semantic nesting is checked independently of the balanced transport.
No proof limits or kernel rules were relaxed. Temporary encoding/decoding uses
bounded trees; excessively large images fail instead of enlarging the limits.
Argument checks apply a total budget across the whole argument vector, as well
as per-value budgets.

## Replay

Emit the normal checked module and actions first, then run the independent
producer:

```sh
ink emit-core application.ink -o core.json
ink emit-actions application.ink -o actions.json
python3 knowledge/producers/action_values.py core.json actions.json -o values
ink check-action-values application.ink \
  --syntax-roles values/syntax-roles.json \
  --value-roles values/value-roles.json --view values/view.json
ink emit-action-values application.ink action arguments.json \
  --syntax-roles values/syntax-roles.json \
  --value-roles values/value-roles.json --view values/view.json -o image.json
```

`arguments.json` uses the action's ordinary JSON input format. The command binds
all supplied evidence and validates the actual action signature before writing.
It records source/action identities and argument images. It does not invoke the
action. The library also provides `decode_arguments`, `encode_result` and
`decode_result`, which use the actual bound action signature.

## Remaining proof boundary

This is code and value data correspondence, not a logical action interpreter.
There is no theorem here that evaluation of a database function implements an
Ink primitive or transaction. There is no universal stateful candidate admission,
physical layout proof or native machine-code proof. The fixed codec's correctness
is currently supported by independent cross-language checks, actual action/event
roundtrips and adversarial tests; it is not formally derived from Lean or the
Ink kernel. Legacy specialised SourceValues remains until its consumers migrate
through the complete action/primitive correspondence interface.
