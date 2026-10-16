# Learned advice over complete checked program structures

The compiled planner can call an ordinary compiled Ink function to order its
search frontier. It receives the complete checked state: source core, existing
representations, facts, physical/protocol choices, routes and capabilities. A
captured typed context can contain learned weights or another authored model.
This is the compiler's implementation state; runtime application values enter
through explicit context, frozen source rows or recorded workload information.
This complements [programmable portfolio objectives](programmable-objectives.md),
which rank eligible deployments offline and in adaptive hosts.

```ink
import "std:search" as search;

adaptive fn priority(candidate:search.Candidate,context:Context)->f64 {
    // Authored model over the complete state and the explicit context.
    return predict(candidate,context);
}
```

This signature is illustrative. The complete
[`search-policy.ink`](../examples/search-policy.ink) example defines its features,
linear model and F32 Adam training action. It uses the existing `trainable state`,
`adaptive fn` and `learn change` forms. This feature adds a standard module and
planner options; it adds no syntax or semantic rewrite authority to the core.
Another model can inspect different structure, combine features nonlinearly or
call the existing source neural libraries. No network architecture, reward,
training target or engagement goal is built into the planner.

## Use a captured model

```sh
printf '%s\n' '{"weights":[1,0,0,0]}' > search-context.json
PYTHONPATH=planner:knowledge python3 -m ink_planner.compiled_planning \
  --compiler target/release/ink --source app.ink --knowledge-root knowledge \
  --target javascript --search-goal examples/search-policy.ink \
  --search-goal-context search-context.json --search-goal-revision 1 \
  -o build/app.plan.json
```

The lower finite score is explored first, with the existing stable tie order.
`--search-goal-entry` defaults to `priority`. The goal must be a pure two-argument
function returning `f64`, with a portable candidate/context interface. The planner
emits and checks its complete core, compiles it literally to JavaScript, captures
the context, and prepares the pure function once in a private Node worker.
Application actions are never executed to obtain a priority. Context JSON uses
schema-directed numeric decoding, preserving exact u64 values above 2^53.

`--search-goal-context-wire` accepts the second parameter's exact value-wire bytes
instead of semantic JSON. This also preserves raw NaN payloads and signed zero.
The context's schema and exact typed bytes are bound into its identity. Mutating
the original context file cannot change an ongoing compilation's captured model.
It affects the next invocation. `--search-goal-core` accepts a retained core image
instead of source, allowing the exact goal to be rebuilt independently of imports.

## Complete structure as shallow data

`search.Candidate` contains:

| Field | Meaning |
| --- | --- |
| `id`, `source` | Checked-state memo identity and selected source image |
| `target` | Requested compilation target |
| `state` | Complete canonical checked-state data as a prepared document |
| `default_priority` | Existing structural exploration estimate, not measured time |
| `frequencies` | Explicit observed/original-entry frequencies, with exact u64 counts |

The document has a root index and a flat list of nodes. Each node contains a kind,
exact scalar text and ordered edges. Kind 0 is null, 1 Boolean, 2 number token,
3 string, 4 array, 5 object. Object edge keys are canonicalized; array edge order
preserves element order. Large word/Int tokens never pass through JavaScript
Number. `search.field`, `search.element` and `search.node` are ordinary source
helpers over this data. The full node/edge lists remain available to other models.

This representation avoids multiplying program nesting depth by a recursive
enum's transport encoding. It preserves the existing value-depth guards. Inputs
are complete within the declared budget: an oversized state disables the optional
goal rather than supplying a silently truncated program. The document and its
metadata are untrusted model input, never proof premises or optimization facts.

## Learn and reconfigure explicitly

The example's `feedback(candidate,target,config)` action updates a complete Adam
state using authored structure features and an authored scalar target. Its
`context()` query publishes the weights for a later compilation. Invalid updates
return an error and preserve the exact checkpoint. The optimizer state can be
saved and restored using ordinary Ink state APIs.

Training candidates can be prepared from `check-plan`'s checked `state` using
`ink_planner.search_goal.document(state)`. Supply the state/source identity,
target, the desired default-priority signal and frequencies in the ordinary
candidate record. This data conversion supplies no proof or performance evidence.
The compiled model's state API applies explicit observations and publishes context:

```js
const learner = policy.createState(); // policy is the compiled source module
for (const observation of observations) {
  const reply = learner.bind('feedback')(
    observation.candidate, observation.target, optimizerConfig);
  if (reply.result.Err !== undefined) throw Error(reply.result.Err);
}
const context = learner.bind('context')().result.Ok;
// Persist context for the next compiler invocation. Also checkpoint the learner
// when training will resume, preserving Adam moments and its step counter.
```

Observations, labels and `optimizerConfig` are application inputs. Use typed
ingress for exact large integers; do not round JSON numbers through JavaScript
Number. The retained integration fixture executes this workflow and checks
failed-update rollback and restoration.

Training can happen before compilation, or an application's continuing training
controller can publish the next context/revision and trigger another compilation.
The active compilation keeps its captured model. There is no automatic fitting
inside search, implicit reward, or live mutation of a queued model. Runtime
portfolio goals use their own explicit serialized `retarget` API. A higher-level
learner still needs an authored outer objective and bounds on permissible updates.

## Authority and failure behavior

The goal only orders already admitted states in the compiled planner's frontier.
It can favor a more expensive intermediate that leads to a useful later rewrite,
or prioritize states with different representation/physical choices. It does not
control recipe dispatch, the inner semantic search, measurement shortlisting or
the final evidence-based selection. These remain further integration boundaries.

Every proposed edge still undergoes complete source-bound proof replay. Invalid
proofs never acquire a model priority. Missing comparable lifecycle evidence still
retains the compiled baseline, even when the model favors an admitted alternative.
No new approximation permission, layout capability or invariant follows from a
learned score. Generalization and profitability require separate evidence.

Nonfinite/out-of-range scores, stale replies, closed workers, oversized data and
timeouts disable the optional goal. Scores lie within ±1e100. The planner reprices
the pending frontier with its ordinary structural estimates, preserving tie order;
it does not restart or trial the model. Failed advice is not cached as a successful
search result. Invalid goal source, signature or initial context fails preparation
with a diagnostic.

The default per-request timeout is one second, capped by remaining planning time;
it is configurable up to thirty seconds. Node's heap setting defaults to 128 MiB
and can be set from 16 to 512 MiB. This excludes process/native overhead. The
request limit defaults to four million bytes and can be lowered. Model core and
generated module each have a sixteen-million-byte limit; context input and its
typed encoding each have a four-million-byte limit. Document preparation also
checks depth, node count and a serialized-size lower bound before sending it.
Model compilation uses the existing checker process timeout; setup is recorded
separately from goal requests. These are explicit resource controls, not a hard
bound on total compiler RSS or compilation time.

## Retention and validation

The plan's receipt records goal source/module/worker identities, typed context and
schema identities, Node versions, process budgets, query timings and bounded
priority diagnostics. Core, generated module and captured context are retained
beside the plan. Export rejects changed captured artifacts. Cache reuse binds the
goal, context, execution version and budgets, and freshly replays the selected
whole plan. A cache hit records historical advice separately from the current
worker, which executes no goal queries on that hit.

`tests/learned_search.rs` and `planner/tests/search_goal_integration.py` exercise:

- A trained source policy changing which branch is explored under the same three
  proof attempts, with all algebraic edges checked by the kernel.
- Real published database candidates, complete CLI discovery and baseline
  retention without comparable performance evidence.
- An invalid proof, nonfinite scores, a timed-out calculation, a stale reply,
  exact >2^53 state/context/frequency values and raw binary64 wire contexts.
- Source model training, failed-update rollback, exact restore and cross-target
  values/snapshots, plus actual eligible GPU controls.
- Retained goal replay, cache identity, worker cleanup, artifact changes and
  bounded input failure. Unit tests independently reconstruct deep flat documents
  and check fallback frontier ordering.

The branch test uses synthetic authored labels; it proves programmable
exploration, not faster compilation, improved held-out search quality, Handwired
parity or broad performance gains. The three-project programme and those
acceptance gates remain active.
