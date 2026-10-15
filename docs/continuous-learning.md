# Continuous learning through ordinary source logic

`std:learning_session` composes an authored update function with bounded feedback,
candidate training and versioned serving. `examples/continuous-learning.ink` is a
complete runnable SGD application. Its companion Node service executes the compiled
JavaScript module through a durable host, while predictions remain available
between bounded training turns. The same source session actions have Rust,
JavaScript, Wasm and GPU-host conformance; learning itself executes on CPU hosts.

```sh
ink build examples/continuous-learning.ink --target javascript -o build/continuous/program.mjs
node examples/continuous-learning.mjs build/continuous/program.mjs build/continuous/session.inkstate
```

Feed JSONL requests with explicit stable IDs:

```json
{"id":"observation-1","call":"enqueue","args":[1,{"input":1,"target":1,"rate":0.1}]}
{"id":"observation-2","call":"enqueue","args":[2,{"input":1,"target":1,"rate":0.1}]}
{"id":"prediction-1","call":"predict","args":[1]}
```

Keep stdin open to continue serving/training. EOF quiesces the current turn and
persists pending work; it does not implicitly drain or discard the queue. Training
and request replies share stdout as separately tagged JSON objects. A service error
stops scheduled work; request handling remains available for inspection and explicit
recovery, and shutdown reports failure. No automatic retry follows uncertain
storage publication. Reopen the durable host before recovering that condition.

Application configuration uses a plain record, for example:

```json
{"id":"pause-training","call":"configure","args":[{"capacity":4,"budget":1,"publish_every":2,"paused":true,"drop_newest":false}]}
```

An observation ID identifies feedback in the source queue; a durable request ID
identifies one attempted action. Retrying an uncertain request uses the same
request ID. After a recorded rejection (such as a full queue), a deliberately new
attempt uses a new request ID while retaining the unaccepted observation's next ID.
Otherwise the durable host correctly returns that earlier rejected reply.

Host controls also accept `{"service":"pause"}`, `{"service":"resume"}` and
`{"service":"wake"}`. Resume explicitly restarts a service stopped by an application
error after the application has repaired its queue/configuration. An uncertain
storage error still requires closing and reopening the durable host first.
Published events remain in the durable outbox until their consumer explicitly sends
`{"acknowledge":["COMMIT","POSITION"]}`. Use exact unsigned decimal coordinates;
unsafe JavaScript integer numbers are rejected. Delivery can repeat across a crash,
so consumers deduplicate event coordinates before acknowledging. Retaining events
forever also retains memory/storage; this example does not silently discard them.

An optional third path bootstraps a **new** durable store from a complete checkpoint:

```sh
ink train examples/continuous-learning.ink TRACE.json -o offline.snapshot
node examples/continuous-learning.mjs build/continuous/program.mjs build/continuous/new.inkstate offline.snapshot
```

Existing durable state takes precedence over the seed checkpoint. Compile and train
the same checked source: normal restore validates its identity. A trace may leave
an unfinished candidate; queue position, candidate model and serving model survive
the transition. This is explicit pre-compilation fitting followed by runtime
continuation. Integrated training as a build stage and frozen-value specialization
remain open.

## Session data and operations

`Session<M,O>` stores the complete serving and candidate model values, bounded
ordered `Item<O>` observations, next observation ID, published progress, dropped
count, source model version, candidate base/ticket, processed count and settings.
The application chooses `M`, `O`, its update and model validity/acceptance functions.
An Adam application must use the whole Adam state as `M`, including moments and
step count; passing only weights would request a different training algorithm.
The session does not generate an objective or update rule.

| Operation | Contract |
| --- | --- |
| `create(model,fallback,settings)` | Empty session; application validates the initial model. `fallback` supplies a typed unreachable read fallback after shape checks. |
| `enqueue(session,id,observation)` | Require the next monotonic ID. Reject overflow transactionally or explicitly drop the newest observation and count it. |
| `configure(session,settings)` | Change pause, capacity, budget or cadence. Cannot shrink capacity below pending observations. |
| `begin(session)` | Copy serving model into a candidate at the current base version; increment its ticket. |
| `advance(session,ticket,steps,update,valid)` | Process at most the requested budget and remaining observations. Invalid updates return an error; publication is separate. |
| `publish(session,ticket,flush,valid,accept)` | Validate current base/ticket, candidate and authored acceptance; atomically replace serving model, increment version and remove its consumed prefix. `flush` explicitly permits publication below cadence. |
| `replace_serving(session,model,valid)` | Increment serving version; an older active candidate stays stale and cannot advance or publish. |
| `cancel(session)` | Reset candidate progress to serving; retain queued observations for an explicit restart. |
| `discard(session,through)` | Explicitly remove/count queued observations through an ID, while no candidate is active. It does not claim they trained a published model. |

Settings cap capacity at 4096 and per-call observations at 1024. Counters reject
before wrapping. Shapes, ordered IDs, progress and version relations are checked
by source functions. These are work/count bounds, not millisecond deadlines or a
bound on the size/cost of an arbitrary model/update. Individual models and update
functions need their own constraints. The example validates observation domains
and checks session/model domains before reading restored state. It deliberately
accepts any candidate with a larger update count; a production loss/safety policy
must be authored for its task.

Operations return values; normal `learn change` actions assign those values to
trainable state. Nested actions retain ordinary transaction semantics. `pump` in
the example composes begin/work/publication according to its source settings;
`abort_turn` demonstrates rollback after that whole composition. Another function
or learning action can compute a policy, configure the session or trigger its work.
Serving queries do not train or mutate state.

## Scheduling and persistence

The emitted runtime helper `ScheduledActions` takes an explicit plan callback:
return null to idle, or `{id,call,args,delayMs}` to invoke one action. The example
reads a source status query, schedules `pump` when unpaused feedback exists and
uses stable IDs from the durable commit version. It yields between turns and
serializes with ordinary serving requests. `setPaused`, `pause`, `resume`, `wake`,
`requestStop` and `stop` control the host loop. From within its callbacks, use the
synchronous controls instead of awaiting that same turn's completion.

Source pause and host pause differ: source pause is durable application policy;
host pause quiesces this service instance. Neither silently cancels a candidate.
Cancellation/discard/publication remain explicit source actions. Parallel training
workers and cross-process/multiwriter promotion are outside this service. The
Node store retains the existing single-writer/filesystem contract described in
[durable hosts](durable-host.md).

Each durable action publishes model, queue/progress, commit and events together.
The source next-ID/progress state prevents previously consumed observations from
being silently re-enqueued as new ones. Durable request receipts have bounded
retention; they do not promise unlimited retry deduplication. A stale external
model candidate needs its own source base/ticket validation; no full old checkpoint
is restored over a newer live application during promotion.

## Evidence and remaining work

The mandatory `adaptive_learning` suite compares 39 lifecycle cases across
reference, Rust, JavaScript, Wasm and the GPU host: capacity/overflow, ordered IDs,
pause/budgets/cadence, serving stability, stale publication, cancellation, invalid
updates, discard, events and exact snapshots. A further test checks fifteen malformed-shape/domain/counter boundaries. Each
conformance run includes a separate numeric call requiring actual GPU dispatch. Reverse model/optimizer execution on the device is not shown.

Four compiled JavaScript durable histories compare full checkpoint bytes against
the independent evaluator: normal restart, storage failure before/after publication,
and an offline CLI bootstrap with unfinished candidate state. The runtime's own
tests cover quiescence, pending-plan invalidation, cooperative yielding, abort,
explicit errors and no overlapping service runs. These are implementation checks,
not proofs of all schedulers, optimizers, storage systems or convergence.

Build-stage training/packaging, frozen specialization, parallel worker promotion,
device training and the broader Handwired performance target remain required work.

[Retained source, checkpoints, target logs and corpus audit](../reports/continuous-learning-2026-10-15/README.md).
