# Modular mathematical projection of actions

This work extends the fixed source-to-mathematics translation used by complete
state-transition proofs. It represents larger computations with transparent
checked definitions. It does not rewrite executable source or select an optimizer
candidate. Graph specialization still needs ordinary database proofs and the
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
