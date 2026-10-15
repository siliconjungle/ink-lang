# Learning phases and lifecycle

Ink must support learning before compilation, as an explicit compilation stage,
on runtime feedback, and continuously while an application runs. These phases
share authored objectives, permitted changes, validation and complete optimizer
state. They differ in their inputs, scheduling, publication and lifetime. This is
an implementation requirement, not a claim that every phase is already integrated.

| Phase | Required behavior | Current implementation |
| --- | --- | --- |
| Pre-compilation training | Fit from a declared dataset, validate and export a source-bound model artifact | `ink train`, portable complete-state checkpoints and exact resume |
| Training during a build | Run an explicitly requested training stage; bind dataset/configuration/model lineage and package the result; freeze only when requested | `build-model` captures/trains/compiles a bound adaptive package; frozen specialization remains required |
| Adaptive runtime learning | Train on declared feedback or drift triggers, under bounded work and acceptance rules | Explicit `learn change`; authored objectives, updates, validation, backtracking and rollback; source-authored trigger/configuration policy; cooperative scheduled actions on a compiled durable host |
| Continuous learning | Consume an ongoing observation stream while serving predictions; schedule bounded work and publish accepted model versions | Authored bounded sessions, separate serving/candidate versions, explicit cadence and cooperative compiled JavaScript service with durable recovery; parallel worker/device execution remains open |

Training control is general application logic. A pure function can inspect full
context, another learner's outcomes, state summaries and configuration, then return
a decision: when to train, which objective/data to use, how many steps to request,
which rate or constraints to apply, and when to pause or propose publication.
Effectful learning actions apply those decisions through declared read/write/event
capabilities. One action may configure or invoke another learner. These are
composable operations; offline, adaptive and continuous behavior should be reusable
policies over them, rather than a closed set of compiler-owned modes.

The checked [two-learner example](../examples/learning-orchestration.ink) does this
today. `feedback` invokes `train_first`, uses the pure `policy` function to choose
the second learner's rate from the first learner's loss, updates configuration and
invokes `train_second` with coupled context. `configure` controls pause flags, rates
and step budgets. All nested changes share a transaction: a failed outer action
restores both learners, settings and events. Tests compare values, errors, events
and exact snapshots across Rust, JavaScript, Wasm and the GPU host. Its separate
numeric kernel exercises actual GPU dispatch; training executes on CPU hosts.
The [session library and cooperative service](continuous-learning.md) now supply
queues, bounded turns, versioned publication and exact durable recovery. Parallel
training workers and device optimizer execution remain open infrastructure.

Continuous learning is more than a host repeatedly invoking an update. Its
contract needs an observation queue and capacity/overflow policy; explicit work
budgets; update and publication cadence; cancellation and quiescence; durable
progress; and recovery without silently replaying or losing observations. An
application can enable both adaptive triggers and continuous updates. Neither
form should introduce training or mutation into readonly queries.

Serving and training also need explicit version semantics. In a background lane,
serving should observe an accepted immutable model version while a candidate is
trained. Promotion must validate the candidate against its source, declared domain
and current base version. Stale candidates require an explicit rejection/rebase
policy. Publication must be atomic with its checkpoint and feedback; partial
weights, reset optimizer moments and overwritten newer models are unacceptable.
A serialized single-threaded loop can use ordinary transactions, with its narrower
concurrency boundary stated explicitly.

The same objective can use full explicit context and a prepared computation shape
in each phase. Training data, objective, seed, optimizer, constraints and permitted
parameter/structure changes must be declared. Runtime activity alone does not
supply labels or permission to change behavior. A frozen build may optimize through
immutable trained values; an adaptive build must retain the mutable degrees of
freedom it promises. Dataset/trace identity and complete checkpoint lineage must
survive both paths.

Acceptance must demonstrate each phase independently and compose them: train and
package offline, restore into a running application, consume feedback continuously,
reject invalid or stale candidates, cancel/recover midway, and continue exactly
from retained observations and optimizer state. Inference values, errors, events
and portable snapshots need cross-target comparisons. Scheduling and profiling
observations grant no proof, approximation or automatic profitability authority.

See [current learning interfaces](adaptive-learning.md),
[prepared reverse models](reverse-learning.md) and the broader
[optimisation programme](chenglou-optimisation-programme.md).

## Delivered cooperative lifecycle

[`std:learning_session`](../knowledge/libraries/learning_session.ink) is model- and
observation-generic authored source. A model value includes all optimizer state
needed by its update function; the session does not infer an objective, discard
moments or choose a training algorithm. Observation IDs are monotonic and queue
capacity/overflow, step budgets, pause and publication cadence are explicit.
The serving model stays unchanged while the candidate advances. Promotion checks
a current ticket/base version and the application's validity/acceptance callbacks.
An external serving replacement makes an older candidate stale. Cancel retains
observations; discard is explicit and counted.

The compiled JavaScript example runs through `ScheduledActions` and `DurableState`.
It serves between cooperative work turns, then atomically persists model, queue,
candidate progress, version and outbox. Tests compare exact state with the reference
across normal restart and storage failure before/after publication. A separate
history boots the service from an offline CLI checkpoint containing an unfinished
candidate. This closes a concrete serialized continuous path; it does not establish
parallel worker promotion, hard real-time scheduling, GPU training, universal
convergence or frozen specialization.


[Training as a build stage](trained-builds.md) now captures the checked module and
trace, resumes complete optimizer state when requested, compiles that captured
module and publishes a new package with a verified startup checkpoint. JavaScript,
native Rust, locked Rust projects, Wasm and mixed GPU hosts support adaptive startup
and continued learning. Existing durable state takes precedence over a deployment
seed. This completes an explicit adaptive build path; frozen specialization and
trained implementation selection remain separate required work.
