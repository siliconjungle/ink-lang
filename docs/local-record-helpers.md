# Local record storage through pure helpers

JavaScript emission can keep record fields in local variables through
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
grant a physical codec. Checked Buffer/Map fields can also remain in local slots:
each field retains its private owner handle and the source's affine moves and
readonly loans. Splitting a wrapper does not grant additional uniqueness.
Conditional record results inside an expanded helper can also merge their fields
directly. Only the selected branch executes; whole-value uses still reconstruct
the ordinary record after the merge.

Small helpers with checked owned parameters can also expand when no record
wrapper is present. For example, a reverse-mode graph can update a private
adjoint buffer through an ordinary function:

```ink
module adjoints;
fn add_to(work:Buffer<f32>,wire:u32,amount:f32)->Buffer<f32>{
 let prior=work.at_or(wire,0.0);
 return work.set(wire,prior+amount);
}
```

The compiler can place this body at an eligible call site. The buffer retains its
same checked owner handle, and List parameters in other helpers remain shared
under the callee's own analysis. This removes a call boundary without changing
the arithmetic, adding a public owner capability or retaining scratch storage
between invocations. The same expansion limits and ordinary fallback apply.

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
List analysis; expansion does not make captured or caller-owned Lists unique.
Changing weights, features, targets and loop inputs still execute fresh work.

The same mechanism handles `foldl`, `foldr` and `fold_until`. Right folds retain
reverse traversal. An inclusive fold tests its stop condition before executing
the triggering step, executes that step, then stops. Every next field is computed
before updating a carried slot. Mutable slots gain no immutable Number facts.
Fresh literal initializers can use their already evaluated fields directly.
Arbitrary borrowed host record initializers retain the ordinary fold path so an
empty fold does not read unused getters or move failures earlier.

For example, an owned working record can carry a buffer without allocating a
record wrapper for every input element:

```ink
module accumulation;
record Work{values:Buffer<f32>,total:f32,}
fn collect(xs:List<f32>)->List<f32>{
 let work=foldl(xs,Work{values:Buffer.empty(),total:0.0},
  fn(x)=>fn(work)=>Work{values:work.values.push(x+work.total),total:work.total+x});
 return work.values.freeze();
}
```

## Bounds and ordinary fallback

Local user-record storage admits at most 64 fields. Expansion requires an
already decomposed record argument and a nonrecursive body. Owned parameters and
results retain the same checked owner operations; owned temporaries remain
internal capabilities. It admits up to 512 source nodes per body, four nested helper
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

The earlier standalone fixture compares 1,080 independent-reference cases through
7,560 compiled/prepared calls, including nested records, immutable list aliases,
owned buffers, fallible boundaries, raw binary64 values and bounded helper/body
fallback. The distribution fixture compares 252 source observations plus one
numeric device control across native Rust, JavaScript, Rust-Wasm and the native
GPU host, with exact CPU snapshots. A separate complete text lifecycle covers
edits, resizes, rollback and restore. Numeric GPU controls do not make record
expansion a device feature.

The [affine-record extension](../reports/affine-record-carriers-2026-10-17/README.md)
adds 1,731 cases in each native/stateful float mode, 96 state outcomes, seventeen
restores, actual workers, map/buffer/nested-owner checks, shared List aliases,
borrowed getter order and bounded fallback. Its new distribution history matches
1,251 reference/Rust/JavaScript/Wasm outcomes and exact snapshots. The complete
standalone package passes 61 tests. Repeated graph and neural measurements retain
all setup costs, adverse samples and the preliminary implementation that missed
folds; these observations do not admit automatic planner choices.

The [matched study](../reports/record-helpers-2026-10-16/README.md) retains complete
text and neural controls, cold/setup costs, code size and small-case losses. This
step does not finish Pretext performance parity, graph/representation learning,
whole-application differentiation or the full
[three-project programme](chenglou-optimisation-programme.md). The emitter,
translation, ABI and host toolchain remain trusted implementation code.
