# Structured preparation and implementation assurance

Compiled immutable keeps now retain structured values until an observed root
changes. This extends preparation beyond scalar queries into neural architecture,
ordinary records, recursive data and selected observations. It preserves source
computation, F32 order, mutable optimizer state, rollback and logical checkpoints.
No source algorithm or knowledge law is selected or replaced.

The same-source JavaScript comparison improves held-out neural prediction from
39.059 to 11.325 µs, **3.45×**. Repeated names from structured rows improve about
3×. A separate dense F32 neural kernel takes 0.363 µs and omits state/ABI overhead;
its remaining gap is substantial. This is not Handwired parity or a claim of broad
native/device performance. [All derived measurements](summary.md) retain losing
cases as well as gains.

## Boundaries that still cost

Returning the whole 4096-row value improves only 1.02×. Cold preparation increases
its first names read from 0.704 to 1.770 ms. One read per table update is about 2×
slower; sixteen reads per update improve 1.86×. The isolated 16,384-row memory case
retains approximately 1.7 MB more JavaScript heap. Engine/JIT costs remain included
in those heap observations; they are not a universal allocation bound.

Complete training-only turns regress about 24%. Turns serving four/sixteen
predictions improve 1.26×/2.07×. `training-pilot.json` used eight warmup frames and
ordered cadences, producing misleading optimistic training-only results. The final
study uses 128 warmup frames, mixed cadence order, identical starting state and
cross-cadence checkpoint checks. The pilot is excluded from current conclusions.

Repeated work and short-lived work have different lifecycles. These receipts do
not authorize an automatic cache/representation choice. Cost-aware retention,
requested-observation lowering, implicit staging and graph specialization remain
required work. The implementation does not meet the full three-project goal.

## Controls and retained inputs

`neural/` captures the complete twelve-frame trained JavaScript package, source,
trace, weights, Adam moments, controls and events. The retained
`neural-verification.json` records successful deterministic training replay. The old emitter's
`neural-baseline.mjs` receives the same source and checkpoint. `table.core.json`
binds both table modules. All outputs are checked independently; neural predictions
also match a separate ordered dense F32 implementation. Training feedback and
complete snapshots agree, including across serving cadences.

The harnesses pin emitters `ae78b7eb` and `62ea46f8`, with the same current core
checker. Six fresh processes per study separate development and holdout inputs.
Eleven interleaved samples per cell consume complete outputs. JavaScript code
generation/source checking, import/factory observations, first reads, warm reads,
mutation/read turns and memory have separate records. Import order is fixed, so
those startup observations are descriptive rather than a reliable ranking. The
emission study excludes training, optimizer search and native compilation.
See [reproduction and phase definitions](../../bench/structured-preparation/README.md).

No inference latency guarantee or model-generalization result follows. Learning
objectives, constraints, timing and acceptance remain application code; there is
no built-in product goal.

## Correctness and build evidence

- Seventeen integration tests pass across the frozen, reverse-learning and
  scalable-state suites. The additional structured fixture checks 35 outcomes;
  the prepared neural fixture checks ten. Reference, Rust, JavaScript and Wasm
  values/events/versions and exact snapshots agree. GPU-host execution agrees,
  with separate actual eligible numeric dispatch. Neural learning is on CPU.
- Instrumented fixtures check reuse during weight changes, transitive and
  unrelated-root invalidation, source Err values, uncached thrown failures, raw
  NaN/container equality, scalar IEEE equality, ordinary/typed input ownership,
  nested public-output mutation, action/host rollback and restore.
- Native invalidation now uses the core's checked effects rather than a second
  syntactic name scan. Four lexical dependency tests reject genuine cycles while
  admitting local names that happen to match action names.
- The exact published standalone core has **407 passing tests**, built without
  backend/knowledge checkouts in both an isolated target and a private archived
  checkout. Private validation compares the package tree with its committed
  distribution source before compilation. Its result, archive identity and log
  hash are retained in `core-private.json`.
- The first shared-target attempt failed two scope tests and linked a different
  library with the same artifact filename. The same source passed with fresh
  targets. `core-shared-failure.log` and `core-cache-discrepancy.json` retain that
  discrepancy; its exact Cargo fingerprint cause has not been formally established.
  `tools/check_core_package.py` now uses private source and target directories.
- Rust/JavaScript/runtime standalone library checks pass (20/1/2 tests); GPU and
  Wasm libraries compile (zero library tests). Feature/partition audits retain
  all 46 required CPU suites and explicit GPU limitations.

Local integration used an unrelated uncommitted query-parser change. Its diff hash
is recorded, and that edit is excluded from publication. The private archived core
validation excludes it. Hosted CI is a separate integration gate.

The source checker, effect analysis, retention controller, ownership analyses,
source-to-proof translation, AD transform, emitters, ABI, toolchains and drivers
remain trusted code. Tests and archive identities strengthen specific evidence;
they do not establish whole-implementation correctness. Pure helpers still provide
some collection operations absent from query bodies. F64/complete Pretext fidelity,
source reverse AD, automatic profitable staging and matched upstream performance
remain open.
