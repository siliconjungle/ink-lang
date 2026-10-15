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
enum, record, Option/Result and list values. It binds dynamic helper arguments
once in order, preserves scope and bounds inlining/work/depth. Mutable state is
never treated as constant. Ordinary equality checking decides admission.

The action projection remains bounded. This extension adds literal enum
constructors in pure helpers and fixed `word_and` correspondence for u64/u32/i32.
Universal neural algebra, floating-point folding, all word primitives, device
learning and general physical-layout selection remain open. Resource exhaustion
is outside transition equality. The checker, projection, codecs, lowerings,
runtimes and toolchains remain trusted implementation code.

Core tests replay portable proofs independently and reject changed/removed frozen
premises after rebinding source identities. Knowledge tests cover effectful
arguments, events/rollback, eager fallbacks and mutable near misses. Distribution
tests cover changing objectives, stale feedback, rehashed proof tampering and
selected cross-target checkpoints. Performance needs separate lifecycle evidence.
