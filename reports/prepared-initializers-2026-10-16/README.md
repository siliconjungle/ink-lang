# Prepared defaults: source staging and continued learning

Value-state defaults can now use explicit keeps whose complete dependency closure
is independent of state and action calls. The existing frontend elaborates these
into ordinary typed keeps and strict cell fallback; no new keyword, primitive,
algorithm recognizer, approximation or automatic profitability choice was added.
Live weights, moments and controls remain mutable. See [source admission and
ownership](../../docs/prepared-initializers.md).

## Complete-call measurements

M4 Pro / Node 25.3.0; medians of three holdout-process medians. Six fresh processes
separate development/holdout inputs, with eleven mixed-order samples per cell.

| Prediction implementation | Latency (µs) |
| --- | ---: |
| Prior scalar-only keep emitter | 38.08 |
| Structured keeps | 11.12 |
| Authored prepared defaults | 9.38 |
| Separate dense F32 kernel, without state/ABI | 0.338 |

Prepared defaults improve **1.19×** beyond structured keeps,
and **4.06×** over the scalar-only control on this workload.
The complete prepared state call remains **27.8×** slower than
the narrower dense kernel. This does not establish matched Handwired performance.

| Predictions per training turn | Scalar control (µs) | Structured keeps (µs) | Prepared defaults (µs) |
| --- | ---: | ---: | ---: |
| 0 | 248.54 | 221.32 | 214.40 |
| 4 | 448.77 | 281.85 | 264.30 |
| 16 | 1035.65 | 467.00 | 425.46 |

Each timed history has eight main turns, two Adam steps per turn and an additional
rolled-back frame every fourth turn. Restore, snapshot comparison and hashes are
outside timing. Input capture, replies/events and complete predictions are included.
All three implementations agree on outcomes and exact typed state payloads.
These contexts and histories differ from the earlier preparation report; its
training-only regression remains valid evidence for that earlier workload.

The two historical controls share their checked source and checkpoint. The new
staged program has a distinct source identity and was fitted independently from
the same twelve-frame trace. Every module restores only its own checkpoint. The
complete schema and payload agree, including all weights, moments, controls,
versions and events. The helper never rewrites a snapshot header.

## Costs and measurement boundaries

The observed first prediction increases from 3.64 to
3.77 ms. Separate-process heap deltas have medians
326,256 and 333,056 bytes. These include engine/JIT behavior
after explicit collection and are not allocation counts or peak-memory bounds.
A retained default can be unused when a live cell already has a value.

Captured-core admission and full CLI JavaScript emission have descriptive medians
of 121.1/791.2 ms for the control and
119.7/785.9 ms for staged defaults.
These include process startup and file I/O; source parsing/import resolution,
training, optimizer search and native compilation are excluded. Every fresh emitted
byte matches the retained module. Startup/snapshot-file I/O and running on another
machine require their own measurements.

The cold-phase pilot is retained but excluded: it observed the oracle's weights
before one control's first prediction. The final harness validates cold outputs
after first predictions. All current conclusions use the corrected complete run,
including its slower cases. See [reproduction and phase definitions](../../bench/staged-initializers/README.md).

## Implementation evidence

- The exact standalone core tree has **413 passing tests** in a private archived
  checkout and target directory, without knowledge/backend checkouts. The receipt
  binds package `93eb41bf`, source `35dd76d6`, archive and log hashes.
- Six new admission tests cover transitive state/action dependencies, cycles,
  wrong types, preconditions, scope capture, generated-name collisions, invariants,
  legacy query defaults and specification interfaces. A shared core name collector
  supports hygienic preparation; the resulting module undergoes ordinary checking.
- Nineteen full integration tests pass across frozen-state, reverse-learning and
  scalable-state suites. The new neural and recursive-default histories compare ten
  and 25 outcomes, errors/events and exact snapshots across reference, Rust,
  JavaScript, Wasm and GPU-host execution. Each additionally dispatches a separate
  eligible numeric kernel. Preparation and training run on CPU hosts.
- Targeted instrumented reruns establish no preparation before observation in these
  examples, one initialization across predictions/training, safe shared defaults,
  lexical capture, public/typed ownership, source Err values, rollback and lazy
  rebuild after explicit restore.
- Explicit freezing of the staged model preserves inference and full logical state
  while withdrawing training writers. `frozen/` contains the real checked immutable
  source binding and checkpoint for subsequent specialization work. A fresh compiled
  JavaScript deployment additionally matches four complete adaptive query replies,
  detaches model outputs, withdraws writers and rejects foreign restore.
- Deterministic training replay validates the retained adaptive package. Fresh
  current CLI emission matches its JavaScript byte for byte. Re-emitting the
  original prepared example retains source hash `1e21ef7a`; its old checkpoints
  keep their original identity.
- Standalone Rust/JavaScript/runtime library checks pass (20/1/2 tests); GPU and
  Wasm libraries compile (zero library tests). Every component pins the exact
  standalone core; tracked JavaScript/runtime locks are refreshed, and CI checks the
  standalone JavaScript locked fetch. All 46 mandatory CPU suites
  remain in the audited conformance partitions.

Local integration includes an unrelated uncommitted query-parser edit whose diff
hash is recorded and whose code is excluded from publication. The private source
archive excludes it. Final hosted CI is a separate integration gate.

These are observations and implementation checks. The dependency/name analyses,
elaborator, checker, fixed retention, emitters, AD, ABI, toolchains and drivers
remain trusted. No whole-implementation correctness, convergence, generalization,
automatic profitable staging, graph/arithmetic specialization, GPU training,
F64/Pretext fidelity or complete upstream-performance claim follows. The full
[programme](../../docs/chenglou-optimisation-programme.md) remains open.
