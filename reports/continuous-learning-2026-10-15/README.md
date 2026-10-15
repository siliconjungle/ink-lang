# Cooperative continuous learning

The authored generic session and source actions implement a bounded queue,
monotonic observation IDs, explicit reject/drop-newest/discard policy, per-turn
work budgets, source pause and publication cadence. Serving and candidate values
stay separate. Base versions and tickets reject stale training/promotion. Cancel
retains observations; an enclosing action failure rolls back all state and events.
The application supplies the whole model/optimizer, observation and update.

`conformance.log` records all nine adaptive-learning tests passing, including 39
new session cases across reference, Rust, JavaScript, Wasm and the GPU host. The
separate numeric call performs actual GPU dispatch. Training is on CPU hosts.
The compiled service uses helper files actually emitted into a complete Rust
project, rather than checkout imports. That checks packaging of the new scheduler
and existing persistence helpers.
`host-tests.log` records 13 scheduler/durable-host tests, including quiescence,
plan invalidation, yielding, abort, storage uncertainty and no overlapping run.

The compiled JavaScript service fixture compares whole checkpoint bytes against
the independent evaluator on four histories: normal durable restart, storage
failure before/after training publication, and offline CLI bootstrap with an
unfinished candidate. Four observations cross two publication boundaries. The
source model is an explicit SGD example; the generic session has no hidden model
or optimizer fields and makes no Adam-equivalence/convergence claim.

`offline.snapshot` equals the reference `queued.snapshot`, including its serving
model, unfinished candidate, pending observations, progress and commit version.
The offline receipt binds source, trace and checkpoint. Recovery compares those
same complete checkpoints, not only predictions or weight values. Persistence
inherits the single-writer/filesystem contract of the existing durable host.

This is cooperative execution. One synchronous action blocks its event loop until
return, so source work bounds matter. Parallel workers, multiwriter promotion,
build-stage packaging/freezing, GPU training, model convergence and the Handwired
speed target remain open. No training throughput or serving latency result is
claimed here. The generic queue currently uses ordinary lists and validates shape;
its per-item/capacity costs must be measured before a physical layout is selected.

The flat metadata ledger binds retained artifact bytes; it is not a proof of
source correctness or artifact authenticity. Local validation retains the same
pre-existing, unpublished semi/anti-join parser change in core/src/syntax/query.rs;
these learning programs do not use those forms. Clean published CI remains the
complete pinned-revision check.

The same final log includes a ninth distinct integration test: fifteen adversarial checks
cover malformed progress/order/version/settings, model-domain guards
and counter exhaustion. Its two cross-target calls include a separate actual GPU
numeric dispatch. `domain-source.ink` retains that test-only source extension.

Audit the retained ledger and coverage gates with `python3 reports/continuous-learning-2026-10-15/audit.py`. The checker does not rerun the
compiler or infer a correctness theorem from passing logs. To reproduce the real
service, run the mandatory `adaptive_learning` suite with all target requirements;
its compiled service case emits its own packaged runtime helpers and reference
checkpoints before executing the four durable histories.

Frozen-corpus audit: 10 attempted, 8 compiled, 8 with alternatives, none selected
without comparable measurement evidence. Twenty-one laws were admitted and five
reused across programs. The median planning/capture time is 45.538 seconds; all
eight searches hit the quick-effort budget and two programs hit the outer timeout.
No canonical facts were added by this session source-library publication; the
proof snapshot is unchanged. No broad optimization gain follows from this audit.
