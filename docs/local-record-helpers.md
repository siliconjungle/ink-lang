# Local record storage through pure helpers

JavaScript emission can keep immutable record fields in local variables through
bounded pure helper expansion and value loops. This extends ordinary literal
execution; there is no new syntax or change to source arithmetic.

```ink
module motion;
record Pair { x:f64,y:f64, }
fn advance(p:Pair)->Pair {return Pair{x:p.y,y:-p.x};}
fn simulate(x:f64,y:f64,n:u32)->Pair {
    let initial=Pair{x:x,y:y};
    return repeat_until(n,initial,fn(p)=>false,fn(i)=>fn(p)=>advance(p));
}
```

The loop can keep `x` and `y` as separate locals and expand `advance` where its
record input already has local fields. Whole-value uses reconstruct the ordinary
record. Nested immutable records, lists, strings and exact binary64 carriers may
be field values; this does not flatten their contents, change public schemas or
grant a physical codec. User records with owned descendants retain ordinary
affine storage. Existing internal loop carriers preserve their prior handling.
Conditional record results inside an expanded helper can also merge their fields
directly. Only the selected branch executes; whole-value uses still reconstruct
the ordinary record after the merge.

## Evaluation and ownership

Every field and argument executes once in source order, including unobserved
fields and unused arguments. An expanded callee gets only its checked parameter
bindings; source shadowing cannot capture a caller's names. Branches remain lazy,
contracts retain their positions and exceptions retain their propagation. Raw
NaN payloads and signed zero stay in the original carriers, with no arithmetic
reassociation or precision change.

Loop fields update simultaneously: the emitter evaluates every next component
before assigning any carried local. Whole values and worker captures materialize
their ordinary snapshots. A helper's parameters remain shared under the core's
loan analysis; expansion does not make captured or caller-owned storage unique.
Changing weights, features, targets and loop inputs still execute fresh work.

## Bounds and ordinary fallback

New immutable field storage admits at most 64 fields. Expansion requires an
already decomposed record argument, readonly parameter/result types and a
nonrecursive body. It admits up to 512 source nodes per body, four nested helper
expansions, 16,384 charged expansion nodes per emission and 262,144 charged source
bytes. One expansion is limited to 65,536 bytes, including its returned expression.
Nested reservations may conservatively charge work again. These bounds restrict
an optional emission mechanism, not the source language.

Combined source/emission nesting stays below 28 to leave stack space for core
type and loan analyses. Merely relying on the ordinary expression depth bound
allowed an initial prototype to overflow a default test-thread stack; the full
text lifecycle regression now runs with the normal stack configuration.

Failed/exhausted expansion restores emitted lines, callbacks, type helpers,
lexical field mappings, scalar facts and fresh names. It retains an ordinary
direct call and cannot consume the ordinary source's admission budget. No
application work, runtime trial or profitability probe executes for this choice.
These structural emission heuristics supply neither a proof premise nor measured
automatic implementation-selection evidence.

## Evidence and remaining work

The new standalone fixture compares 1,080 independent-reference cases through
7,560 compiled/prepared calls, including nested records, immutable list aliases,
owned buffers, fallible boundaries, raw binary64 values and bounded helper/body
fallback. The distribution fixture compares 252 source observations plus one
numeric device control across native Rust, JavaScript, Rust-Wasm and the native
GPU host, with exact CPU snapshots. A separate complete text lifecycle covers
edits, resizes, rollback and restore. Numeric GPU controls do not make record
expansion a device feature.

The [matched study](../reports/record-helpers-2026-10-16/README.md) retains complete
text and neural controls, cold/setup costs, code size and small-case losses. This
step does not finish Pretext performance parity, graph/representation learning,
whole-application differentiation or the full
[three-project programme](chenglou-optimisation-programme.md). The emitter,
translation, ABI and host toolchain remain trusted implementation code.
