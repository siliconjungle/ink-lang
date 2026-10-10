# General finite sequence append

`xs.concat(ys)` has type `List<T>` when both operands have the same `List<T>`
type. It returns the elements of `xs`, in order, followed by the elements of
`ys`, in order. Both operands are evaluated once, receiver first. There is no
element conversion, arithmetic or callback. An empty operand contributes no
elements. The result is a fresh outer list and does not mutate either operand.
Nested values retain their values; immutable elements may share representation.

The core permits every already admitted list element type. A target supports
the subset its existing value representation can carry, and must reject wider
types explicitly. Concatenation does not create general JSON objects, mutable
arrays, patch paths or a special Frontier execution mode.

## Length and resource policy

Append is mathematical concatenation of finite sequences. Its length is the
sum of the operand lengths, without U32 wrapping, clamping or truncation. It
has no index argument. Existing `count` semantics still return the finite
length in the wrapping U64 word ring. Existing indexed operators retain their
own index semantics; append does not silently change them.

Hosts have physical allocation limits. Failure to represent or allocate the
combined result is an execution error, never a truncated successful result.
The reference evaluator checks machine-length addition, charges the combined
outer length against its existing fuel budget and uses fallible reservation.
Ordinary operand evaluation still charges nested copies. Evaluation fuel and
allocation are resource limits of the implementation, not additional premises
of pure value equality. A resource-bounded run may fail where an equal but less
expensive expression succeeds.

F32 elements are copied as values represented by exact 32-bit patterns. Append
preserves signed zeros, infinities and NaN payloads where accepted by the CPU
input contract. It performs no sum reassociation or other floating arithmetic.
Vector and record element order and fields are unchanged.

## Version and trust boundary

Executable modules containing concat use `ink-executable-core-v3`. Programs
without concat keep their prior v1/v2 tag and canonical bytes. Decoding an
executable module rechecks its source program and recomputes its required tag;
a concat program falsely tagged v1 or v2 is rejected. The method expression
representation and source parser are unchanged.

Semantic terms add the fixed operator `method:concat` with exactly two
arguments, both of the same list sort as the result. Its only new definitional
computation is:

```text
concat(Nil, ys)         = ys
concat(Cons(x,xs), ys)  = Cons(x, concat(xs,ys))
```

This is a general structural definition. It adds no trusted associativity,
count-distribution, map-distribution, patch theorem, or package-specific rule.
The existing list induction and equality proof rules can check such theorems
as external proof objects. Every proof object is still checked locally, and
selection must replay against the exact source term. Hashes and catalogue
membership supply identity and discovery, not proof authority.

The existing semantic-term and conditional-law v1 wire schemas remain
additive operator schemas. Old checkers reject unknown `method:concat` terms;
new checkers validate their arity and sorts and compute the two clauses above.
Prior operators and proof rules have unchanged meanings. A new checker binary
and its primitive implementation are part of the trusted implementation
boundary; external admission receipts must identify that binary. New concat
proof bytes cannot be admitted by assuming an old checker supports them.

## Backend contract and validation

JavaScript must allocate a fresh outer array and copy both inputs in order,
including typed-array inputs. C/Wasm must check representable combined element
count and byte size, allocate fresh output storage, and preserve packed element
bytes. A borrowed input remains live until its copy completes. Backends need
not reproduce the reference interpreter's particular allocation strategy or
fuel accounting to produce the same successfully returned values.

Concat is initially outside the WebGPU shader grammar. Runtime fallback must
record that reason. A CPU fallback timing is not a GPU-kernel timing. An
external law may make a source containing concat eligible for a later GPU
lowering, but eligibility and measured speed remain separate evidence.

Independent core fixtures cover empty/nonempty boundaries; all reference value
families; U32/U64/I32 boundaries; F32 exceptional bit patterns; nested lists,
vectors and records; contextual numeric typing; invalid arity and element
types; version forgery; evaluation budget exhaustion; source/semantic
round trips; and rejection of order reversal, element mutation and universal
commutativity claims. Backend fixtures additionally check output freshness,
operand preservation and byte-exact output where the target supports the type.
Test receipts, external proof replay and measured profitability must be archived
separately; writing fixtures does not establish that they have passed.
