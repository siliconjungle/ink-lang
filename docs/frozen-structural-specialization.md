# Learn a choice, then specialize its computation

Learning can select authored program structure as well as numeric parameters.
`examples/adaptive-structure.ink` supplies an expanded bit circuit and a packed
word operation, a trainable representation choice, mutable application rows, and
an ordinary objective over latency, energy and memory observations. Its trace
contains illustrative observations, not benchmark results.

```ink
enum Representation { Expanded, Packed, }
trainable state Choice:Representation = Representation.Expanded;

fn evaluate(representation:Representation,x:u64,offset:u64)->u64 {
 return choose(representation==Representation.Packed,x&255,expanded(x))+offset;
}
adaptive query serve(key:u64,x:u64)->u64 reads(Choice,Rows) {
 let offset=Rows.get(key).unwrap_or(0);
 return evaluate(Choice,x,offset);
}
```

The complete example defines all referenced declarations. Its learning action
compares paired, bounded observations using the current authored objective.
`retarget` changes weights, increments an objective version and resets accumulated
scores. Old-version feedback rejects atomically. Another controller or learner can
call these ordinary actions. This demonstrates a programmable application target.
The separate [authored objective controller](programmable-objectives.md) now also
ranks already checked compiled portfolios offline and at runtime using ordinary
Ink code and captured typed context. General compiler search heuristics and
correctness/measurement admission retain their existing contracts.

A learner that changes objectives needs its own authored outer goal and bounds
on permitted reconfiguration. A lower score under a different objective does not
establish an improvement under the old one. Objective updates change ranking;
they do not manufacture correctness or approximation permissions.

## Build the learned structure

```sh
ink build-model examples/adaptive-structure.ink \
    examples/adaptive-structure-training.json \
    --freeze-roots Choice --specialize-frozen \
    --target javascript -o build/specialized-structure
ink verify-model build/specialized-structure --replay
```

Training chooses the packed representation in this trace. Explicit freezing binds
that choice into new source and withdraws its writers. An external knowledge
producer proposes partial evaluation through immutable reads, records, helper
parameters and branches. The serving action becomes `(x & 255) + offset`: no
choice lookup, representation dispatch or expanded-circuit call remains. Live
`Rows` reads and updates remain. Unused helper declarations may still be emitted;
this is not whole-module dead-code elimination or a physical state layout change.

The flag requests structural specialization explicitly. It is not automatic
profitability selection. Normal builds retain their baseline. Missing tooling,
unsupported projection or failed proof rejects the explicit request before
publishing its destination. `--python PATH` selects the authoring interpreter.

The package retains training inputs/state, restricted `compiled.core.json`,
`deployment.snapshot`, portable `selection.json` and `selected.core.json`.
The restricted source owns the checkpoint namespace; sealed equality selection
preserves it. Verification always replays restriction and specialization proofs,
even without replaying training. Rehashing an altered proof does not validate it.

Longer closed traversals now use [typed helper composition](frozen-composition.md)
through the same build flag. Their `selection.json` contains an
`ink-compiled-plan-v1` packet; verification replays every source extension and
complete action rewrite. The direct selection format remains supported.

Separate authoring also uses normal checked selection:

```sh
python3 knowledge/producers/frozen_specialization.py frozen.core.json \
    --ink target/debug/ink -o selection.json
ink build frozen.core.json --core --selection selection.json \
    --initial-state deployment.snapshot --target javascript -o app.mjs
```

## Proof domain and limits

The core derives `frozen_domain` solely from checked immutable rows, absence of
writers and exact restore checks. Whole-action replay receives those facts after
existing sorted-table premises. Arbitrary source predicates, training scores and
producer hints supply no facts. Signatures, capabilities, functions, schemas and
immutable bindings remain identical.

The producer uses ordinary substitution and exhaustive case elimination. Every
action needs a complete transition proof over all admitted inputs and mutable
states, including replies, errors, rollback, versions and ordered events. Case
elimination transports premises without adding induction hypotheses. Evidence
records the `ink-frozen-roots-v1` domain.

This preserves the restricted application's behavior; it does not prove arbitrary
variants interchangeable. Allowed-result, approximation and probabilistic
contracts retain separate admission proofs. Learning cannot silently relax
invariants or error bounds. Physical layouts need checked codecs, preservation
and migration. Live switching needs a checked transition; freezing explicitly
withdraws the chosen mutation.

The bounded proposer handles literal u32/u64 keys and frozen word/Boolean/unit,
F32, enum, record, Option/Result and list values. It binds dynamic helper arguments
once in order, preserves scope and bounds inlining/work/depth. Mutable state is
never treated as constant. Ordinary equality checking decides admission.

F32 materialization preserves signed zero, subnormals and exact exceptional-value
bits. Finite values use ordinary Float literals; infinities and NaNs use the fixed
`f32_from_bits` operation. Floating comparisons, including nested stored values,
stay in source: Python syntax equality does not implement IEEE equality. The
untrusted proof tactic also retains F32 operators as ordinary core terms instead
of interpreting their bit carriers as integers.

`examples/frozen-numeric-structure.ink` configures a numeric representation and
coefficients, freezes `Model`, then specializes its serving computation. The
serving action loses its frozen table lookup, record dispatch and helper call;
live-row reads remain. Other queries preserve raw coefficient bits and IEEE
comparisons. Its supplied trace is explicit configuration, not a demonstrated
fitting or convergence algorithm. A programmer can produce the same typed
configuration through their own learner.

```sh
ink build-model examples/frozen-numeric-structure.ink \
    examples/frozen-numeric-structure-training.json \
    --freeze-roots Model --specialize-frozen \
    --target javascript -o build/frozen-numeric
ink verify-model build/frozen-numeric --replay
```

The [action sequencing correspondence](f32-transition-primitives.md) reuses fixed
scalar meanings after ordered argument evaluation. Tests include effectful
operands, events, rollback, observations inside bitcasts and unsupported-domain
rejection. Compiled validation checks full replies and checkpoints while live
numeric state changes. These establish implementation coverage, not a performance
ranking, whole-checker proof or general neural graph specialization.

## Compile a frozen program while weights remain trainable

The proposer can expand `foldl` and `foldr` over closed literal lists. Each
initializer and intermediate accumulator is bound once under a fresh name.
Floating arithmetic stays in its authored order; right folds visit their
terminal steps in reverse list order. Existing work, source and proof bounds
still apply. An unknown traversal is not evidence for unrolling.

`examples/frozen-program.ink` keeps an eight-operation sequence in `Structure`
and coefficients in a separate trainable `Weights` root. Freeze only the program:

```sh
ink build-model examples/frozen-program.ink examples/frozen-program-training.json \
    --freeze-roots Structure --specialize-frozen \
    --target javascript -o build/frozen-program
ink verify-model build/frozen-program --replay
```

Its serving action loses the operation list, traversal, helper call and operation
dispatch. Numeric weights and live application data are still read on each call.
`retune` remains a learning action; `configure` is withdrawn. ReLU decisions
remain dynamic, including their exact NaN/signed-zero behavior. This demonstrates
compiling a configured program structure while keeping its numeric degrees of
freedom mutable. The supplied trace is explicit configuration, not a fitted
reinforcement-learning or neural-training result.

[Structural conversion](structural-conversion.md) compares shared mathematical
structure and prunes known control before substitution duplicates it. Ordinary
complete action proofs remain mandatory. The cross-target history includes
successful and rejected weight updates, fresh serving inputs, events, live data,
restore and every exact checkpoint. This bounded static traversal is progress
toward graph specialization; arbitrary neural graphs and tape programs remain
further work. [Shared frozen literals](frozen-literal-sharing.md) now transport
long parameter lists and tables through small transparent definitions. This
removes the first data-depth bottleneck without raising transport limits; long
straight-line action continuations and factored graph proofs still need work.

Proof construction first tries to transport fixed rows between source-bound
case forms without fully expanding live arithmetic. If the ordinary checker
rejects that proposal, the proposer retries the existing normalization tactic.
Both attempts use the same equality obligations and source facts. This keeps
more repeated computation out of portable proofs; it adds no trusted producer
shortcut. JavaScript also keeps leading lexical bindings in the action body
instead of nesting a separate function wrapper for each accumulator.

The [release study](../reports/frozen-program-2026-10-16/README.md) retains six
paired processes, the earlier unrolling regression and the larger proof-bearing
package. A [private committed-source rebuild](compiler-image-reproducibility.md)
checks exact executable images and startup state. These finite checks strengthen
implementation assurance without establishing correctness of the whole compiler.

The action projection remains bounded. This extension adds literal enum
constructors in pure helpers and fixed `word_and` correspondence for u64/u32/i32.
Universal neural algebra, floating-point algebraic folding, all word primitives, device
learning and general physical-layout selection remain open. Resource exhaustion
is outside transition equality. The checker, projection, codecs, lowerings,
runtimes and toolchains remain trusted implementation code.

Core tests replay portable proofs independently and reject changed/removed frozen
premises after rebinding source identities. Knowledge tests cover effectful
arguments, events/rollback, eager fallbacks and mutable near misses. Distribution
tests cover changing objectives, stale feedback, rehashed proof tampering and
selected cross-target checkpoints. Performance needs separate lifecycle evidence.

The owned-continuation conversion extension initially exhausted the existing
eight-operation action's proof budget in CI. Necessary outer-syntax checks now
avoid incompatible speculative reductions before copying their arguments. The
same compact equation passes without raising limits, and removing its frozen
premise still rejects. All 488 standalone core tests and the existing 144-outcome
native/JavaScript/Wasm history pass locally. The
[regression report](../reports/conversion-and-f32-literals-2026-10-17/README.md)
retains the failures, exact proof and source-bound validation. Larger combined
projection/unrolling remains resource-limited.
