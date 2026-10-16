# Modular mathematical projection of actions

This work extends the fixed source-to-mathematics translation used by complete
state-transition proofs. It represents larger computations with transparent
checked definitions. Projection alone does not rewrite executable source or select
an optimizer candidate. Graph specialization still needs ordinary database proofs and the
planner's separate applicability and profitability gates.

The retained source fixture is the existing staged neural application: 244
parameters, mutable optimizer/control state and a frozen architecture root. Its
six actions now have a standalone checked mathematical projection. The current
fixture produces 316 definitions and 5,073,076 canonical bytes, including producer
normal-form hints. These are proof-data sizes, not runtime memory measurements or
an inference speedup. The CLI exports canonical JSON: deeply nested pretty
indentation would inflate this fixture to 42,053,579 bytes. Compact canonical
transport retains the identical model within the existing byte allowance.

## Construction

The ordinary projection remains the first attempt, preserving its declaration
order and identities. Reachable pure source bodies can be prepared ahead of
nested lowering without changing mathematical names or executing source work.
This avoids the reproduced native test-stack overflow from nested elaboration.
Preparation has bounded source-node and byte budgets; exhaustion retains ordinary
elaboration and its checks.

If the ordinary attempt exhausts its definition or construction allowance, the
modular attempt constructs reachable pure functions in dependency order and gives
each source function, action and observation its own bounded construction phase.
Source helper cycles remain unsupported. The construction allowance is 20,000
steps per phase. This is distinct from the existing independent checking budgets.

Long mathematical bodies share closed lexical fragments through typed helper
parameters. Captures retain their individual positions, types, literals and
operand order. A syntactic `SelfCall` remains in its original recursion scope.
Repeated declarations can share exact structure modulo lexical binder names;
unsupported or exhausted optional sharing retains ordinary definitions. Every
retained definition still passes ordinary type and termination checking.

An action branch can call a shared suffix when it falls through. That suffix
receives the current locals, logical state and staged events. Early returns and
errors keep their original exits. Nested action continuations also capture the
caller's values explicitly. Sharing a keep similarly shares its definition,
passing the current state at every read, including reads following writes. It
never caches a mutable keep value in the mathematical model.

The modular graph uses the existing registry entry ceiling (8,192), with
incremental accounting for complete entry bytes. Retained entries and the complete
serialized projection remain bounded by the core's 16 MB allowance. Individual
kernel term depth, parameter, computation and proof-check limits are unchanged.
Unsupported meanings and exhausted bounds still reject.

## Additional source correspondence

Binary32 conversions `u32_from_f32`, `u64_from_f32` and `i32_from_f32` use ordinary
checked definitions over existing float and word operations. They truncate before
checking the inclusive lower and exclusive upper range. NaNs, infinities and
out-of-range values return `None`; negative fractions between -1 and 0 return
`Some(0)`. A significand/exponent decoder supplies the integer magnitude. No new
kernel numerical primitive or optimizer equality rule is added.

Pure `Option.map` and `Result.map` preserve the selected arm and unchanged error
payloads. Pure list `zip` stops at the shorter list, retains left/right callback
argument order and transports both named and surrounding callback captures.
These additions apply to the source projection; they do not add backend features.
Binary64 and arbitrary-precision float-to-integer correspondence remain outside
this extension.

## Evidence and limits

Focused independent checks compare projected results with the reference evaluator
at IEEE boundaries and seeded bit patterns, through nested paired/sum callbacks,
and across complete committing/aborting action observations. Separate tests check
reads after writes, caller captures, sticky nested errors, rollback, event order
and 128 captured source traversals with different arguments. The larger neural
fixture checks complete projection serialization and standalone declaration replay
on the normal Rust test stack.

The source-to-proof translator remains trusted implementation code. These finite
checks are not a proof of translation correctness, all backend behavior or
compiler correctness. The complete private standalone run passed 480 tests across all 80 integration
targets, library checks, example builds and doctests. Three retained source-bound
artifact selections also replay with the new core. The matching standalone package
and matching backend/runtime pins are published. See the
[retained report](../reports/modular-action-projection-2026-10-17/README.md). Frozen graph/code specialization, learned
representation choices, measured upstream performance parity, device training and
the full Handwired/Pretext/Freerange programme remain required work.

To inspect the retained complete graph with a compiler containing this change:

```sh
ink emit-action-model core/tests/fixtures/staged-neural-frozen.core.json \
  --core -o build/staged-neural-model.json
```

## Pure function correspondence

`emit-function-model` projects requested pure computations without requiring an
action wrapper or frozen state:

```sh
ink emit-function-model build/source.core.json --core \
  --functions chosen -o build/functions.json
python3 knowledge/producers/function_specialization.py build/source.core.json \
  --functions chosen --ink target/debug/ink -o build/functions.plan.json
ink check-plan build/source.core.json build/functions.plan.json --core
ink compile build/source.core.json --core --plan build/functions.plan.json \
  --target javascript -o build/selected.mjs
```

The producer partially evaluates closed call arguments inside the named function.
Other arguments, including weights, remain live. It admits generated helpers with
a conservative source extension, then proposes a `functions` plan step with
`ink-source-functions-v1` evidence. The general checker re-derives both complete
source projections, authenticates every source definition and requires an
unconditional pointwise equality for exactly every changed function body.
Signatures, other declarations, actions, state, contracts and initial bindings
must remain identical. Callers can continue using those functions normally.

Pure declaration imports follow their actual references and the field sorts
needed to type them. Unrelated helper discovery cannot change a collection
carrier or the identity of an identical primitive definition. Legacy action
projection identities retain their previous import convention. Closed literals
in proposed proofs can use transparent mathematical definitions; ordinary proof
checking still establishes every conversion, with the existing resource limits.

This supports a staged branch inside a mutable computation. The original test
authors a structural guard around a 32-node owned F32 graph, dispatches matching
graphs to a specialized function, and otherwise calls the generic evaluator.
Code and weights remain writable. The function proof optimizes the staged branch.
A JavaScript
history checks 200 calls, graph changes, live weight changes, events, rollback and
five restores. Eight focused core tests cover projection, ownership, exact float
bits, source binding, missing proofs and invalid replacements. The larger history matches 335 complete outcomes and exact snapshots against the
reference evaluator on Rust, JavaScript and Wasm, with six restores and seeded
JavaScript startup. The combined standalone core, including concurrent word-count
proof support, passes 501 tests across all 83 integration targets, library checks,
example builds and doctests.

The [retained evidence](../reports/mutable-function-specialization-2026-10-17/summary.json)
includes the complete plan, source images, histories, package receipts and failed
development attempts. Its auditor can replay the proof and reproduce the emitted
JavaScript and Rust source with an independently rebuilt compiler:

```sh
python3 reports/mutable-function-specialization-2026-10-17/audit.py --ink target/debug/ink
```

### Generate a guard and fallback

The knowledge producer can also create that branch from a generic pure function:

```sh
python3 knowledge/producers/guarded_specialization.py build/source.core.json \
  --function evaluate --parameter code --value build/configuration.json \
  --ink target/debug/ink -o build/guarded.plan.json
ink check-plan build/source.core.json build/guarded.plan.json --core
ink compile build/source.core.json --core --plan build/guarded.plan.json \
  --target javascript -o build/guarded.mjs
```

The JSON value nominates one configuration; it supplies no invariant or equality
fact. An ordinary source extension introduces a configuration helper and a clone
of the original function. A checked rewrite inserts an exact guard, a matching
branch and the original computation as fallback. The function producer then
specializes the matching branch through ordinary universal equalities. Neither
state nor parameters become frozen: changing the configuration takes the generic
branch, and changing weights or inputs continues to evaluate fresh arithmetic.

The proof database contains a parametric guarded-substitution law and a separate
law relating list `==` to exact structural identity. Instantiating the latter
avoids normalizing the entire known graph inside the guard proof. Separately
named recursive comparison helpers are related by ordinary structural induction,
including generalized parameters and immediate recursive constructor fields.
No shape match, fingerprint or profile grants equality authority.

Bare F32 guards compare singleton lists, preserving signed zero and NaN payload
bits rather than using scalar IEEE equality. Unsupported configurations, including
binary64 and owned values, fail closed. Literal construction and proof search are
bounded; not every admitted configuration produces a specialization opportunity.
The 32-node mutable graph replays with the ordinary 2 MiB test stack and existing
proof limits. The larger-stack development probe is not needed by the final proof.

This remains explicit proposal generation. Automatic discovery, measured
profitability, learned representation choice and device training remain separate
requirements. The JavaScript F32 capture regression also checks the implementation
boundary: raw host tags become private immutable values, while unused scalar
parameters and borrowed field reads retain their demand behavior. These finite
tests do not prove the emitter or ABI correct.

The mathematical word carrier can include more values than a narrower source
type. The checker currently requires equality over that full carrier; it does not
accept programmer-supplied range promises to weaken the obligation. Unsupported
source correspondence, including binary64 arithmetic, fails closed. The source
translator, lowerers, runtime and toolchains remain trusted implementation code.
An admitted equality provides no automatic profitability evidence; full lifecycle
measurements or an admitted validated cost model still gate automatic selection.
