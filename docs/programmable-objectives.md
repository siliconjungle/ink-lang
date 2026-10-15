# Authored and learned planner objectives

An application can supply ordinary compiled Ink code to rank a complete eligible
portfolio. The default adaptive policy still minimizes predicted execution time.
Opting into an objective can prefer a slower implementation for memory, an authored
utility function, or a learned preference. There is no built-in engagement goal.

```ink
import "std:objective" as objective;

adaptive fn rank(candidates:List<objective.Candidate>, context:Context)
    ->List<objective.Rank> {
  return candidates.map(fn(candidate)=>rank_one(candidate,context));
}
```

This signature is illustrative; [the complete example](../examples/programmable-objective.ink)
defines `Context` and `rank_one`, validates parameters and filters invalid scores.
`adaptive fn` remains a pure function. It receives the whole candidate list and
any explicit typed context the application supplies: model parameters, application
state, workload features or a simulation state. The function can use ordinary Ink
algorithms, nonlinear models or comparisons across candidates; weighted metrics
are only the example's policy. This introduces a standard module and host/CLI APIs,
not a new objective expression language or implicit training syntax.

## Compile and deploy

```sh
ink build examples/programmable-objective.ink --target javascript -o objective-model.mjs
```

Use a prepared adaptive bundle from [adaptive state execution](adaptive-state.md).
Import its trusted compiled modules and create a captured objective:

```js
import * as model from './objective-model.mjs';
import {prepareInkObjective,objectiveIdentity} from './objective.mjs';
import {loadAdaptiveState} from './adaptive-state.mjs';

const latency = await prepareInkObjective(model, {
  entry:'rank', revision:1, direction:'minimize', minimumImprovement:0,
  context:{latency_weight:1,memory_weight:0,switch_penalty:0,preferences:[]}
});
const app = await loadAdaptiveState(new URL('./ready.json',import.meta.url), {
  targetKey:DEVICE_AND_TOOLCHAIN_KEY, objective:latency
});
const memory = await prepareInkObjective(model, {
  entry:'rank', revision:2,
  context:{latency_weight:0,memory_weight:1,switch_penalty:0,preferences:[]}
});
await app.retarget(memory,objectiveIdentity(latency));
```

The token captures typed context before yielding and binds its exact encoded
bytes, including raw binary64 distinctions. Later mutation of the caller's object
does not change it. Its identity includes source module, entry, revision and a
context digest. Compiled code and host adapters must come from a trusted deployment;
metadata and hashes do not authenticate arbitrary JavaScript. Tokens are opaque
and scoped to one loaded objective host module.

`retarget` serializes with application calls and checks the expected old identity.
It discards the partial observation window and pending confirmations, preserving
total calls, residence history, switch limits and disabled state. Pass `null` as
the new token to restore the default latency policy. A controller that trains a
model or changes goals publishes a fresh captured context/revision explicitly.
No learner, training schedule, gradient update or runtime experiment is implicit.
The native `ink_runtime::adaptive::Objective` accepts an owned, trusted compiled
scoring adapter and uses the same `ink_abi::objective` decision contract.

## Shared decision contract

Each candidate includes exact artifact identity, current status, window counts,
state-size feature, horizon, execution/migration forecasts and measured peak
memory. The fields are defined in [the standard module](../knowledge/libraries/objective.ink).
Existing identity, evidence, migration-domain, memory, pause, saturation and switch
gates run before the objective. Comparable timing cells remain required even for
a different objective. The current implementation is retained when its score is
missing, estimates overlap, or improvement does not exceed the absolute
`minimumImprovement`. Minimize uses `current.low - candidate.high`; maximize uses
`candidate.low - current.high`. Signed and zero scores are supported. There is no
division by the old score. Scores must be finite ordered intervals within ±1e100;
up to sixteen variants are supported. Resource estimates are empirical, not hard
future bounds.

The shared Rust/Wasm ABI binds every assessment to the complete request: goal,
profile, target, workload, current implementation, policy and controller state.
Stale or ineligible scores reject. Sustained-window and residence rules still
apply. Migration checkpoints the live state, restores the candidate and checks
the exact portable checkpoint before committing. No application action is retried
or executed on another variant to acquire a score.

The objective owns the meaning of its intervals. A weighted positive linear
combination of valid cost bounds can transport those bounds; an arbitrary neural
prediction does not acquire certified uncertainty merely by returning `low/high`.
The result is ranking advice, never proof of correctness or future utility.

## Offline selection

The planner command invokes the same compiled goal and shared ABI:

```sh
PYTHONPATH=planner python3 -m ink_planner.objective \
  --host-dir build/adaptive --goal-module objective-model.mjs \
  --adaptive adaptive-request.json --configuration objective-config.json \
  --previous-goal previous-goal.json -o objective-decision.json
```

`adaptive-request.json` is the ordinary `ink_abi::adaptive::Request` (binding,
profile, policy, current, state, window). The configuration has the fields accepted
by `prepareInkObjective`, including `entry` and typed `context`. Previous identity
is optional; omitting it restarts confirmation. The receipt records exact input
digests and the proposed decision. This ranks an already checked portfolio; it does
not construct a new proof, commit a migration or redirect all compiler search
heuristics. A separate [compiled source search goal](learned-search.md) can now
order the compiled planner's frontier using complete checked program structures;
recipe dispatch, inner search and evidence-based deployment selection retain their
own contracts.

## Learning goals and permitted behavior

The application may use its existing `learn` actions, training controllers or an
external trainer to change model state and publish a new objective. A higher-level
controller needs an authored outer goal and limits on permissible updates. Changing
the metric is not evidence of improvement under the previous metric.

Structural choices still require checked alternatives. Approximate behavior needs
an explicit error contract and corresponding authority; learned scores cannot
waive exact semantics or invent permission to loosen invariants. Energy, quality
and other signals can enter explicit context, but this feature does not measure
them automatically or provide universal certified forecasts. Continuous learning,
physical/backend alternatives and pre-compilation specialization use their own
existing admission and training contracts.

## Validation

`abi/tests/objective.rs` covers resource gates, signed objectives, maximization,
uncertainty, changed goals, stale assessments and native/Wasm decision agreement.
`tests/adaptive_host.rs` and its real compiled Ink goal fixture cover offline and
runtime selection, both migration directions, transaction results, exact snapshots,
one execution per action, immutable capture, stale updates and preserved limits.
`tests/programmable_objective.rs` compares source objectives with the independent
reference, native, JavaScript and Wasm execution, including invalid/overflowing
contexts. Binary64 goals use CPU fallback on GPU hosts; the separate F32 control
checks actual eligible device execution. Synthetic prices test policy behavior,
not speed or universal learned optimization.
