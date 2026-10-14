# Whole state protocol implementation

The compiler now emits eligible source actions as preflight kernels, maintains
scalar reads directly, publishes grouped scalar outputs through retained consumer
slots, supports proved scalar column prefixes, and records action-native typed
changes. Knowledge proposes complete combinations; the planner checks and measures
those combinations offline. Snapshot row encoding is another independent choice.

## Steady-state comparison

Three fresh Node processes; 4,096 rows; full-width wrapping U64 values; synchronous
update plus both aggregate reads. Each lane receives 120,000 warm-up calls and
16,384 iterations per timed round. Connected lanes use one positional Ink consumer
or one batched Preact effect. No DOM or framework-rendering claims are made.

| Implementation | Update + two reads | Connected update + reads |
| --- | ---: | ---: |
| Ink general protocol, maintained map | 0.521 µs | 0.527 µs |
| Ink compiled map kernel | **0.236 µs** | **0.374 µs** |
| Ink Word64 columns | 0.257 µs | 0.367 µs |
| Ink exact-Number columns with widening | 0.407 µs | 0.449 µs |
| Preact manual delta | 0.224 µs | 0.262 µs |
| Preact manual delta + commits/events | 0.345 µs | 0.348 µs |
| Svelte manual delta | 0.258 µs | — |

These are medians of process medians, not statistical confidence bounds. Within
processes, the median ratio of compiled map/general update time is 0.565: about
43% less time. The corresponding ratio against the Preact commits/events control
is 0.703: about 30% less time. Connected map publication uses about 29% less time
than Ink's general protocol, but the paired ratio against the closest Preact
control is 1.044. Ink has not established a connected-consumer win or an advantage
over raw signals across workloads. The Svelte/raw controls omit version/event
bookkeeping. The commits/events control matches this hot action, not general host
transactions and portable snapshots.

Two unchanged scalar reads take approximately 14 ns for compiled Ink versus 27 ns
for general Ink and 11 ns for the Preact control. These are sustained throughput
observations, not single-call latency guarantees.

Earlier 20,000-call warm-up runs were highly variable and sometimes showed a
regression. Both raw samples and a V8 deoptimization trace are retained. The trace
includes allocation-site tenuring and insufficient-feedback deoptimizations. A
separate isolated kernel run and longer, explicitly declared warm-up support the
steady-state comparison. They do not erase cold costs; lifecycle acquisition
measures module load, initialization, checkpoint and restore independently.

## Mechanisms and authority

- `protocol(preflight)` requires source-derived bounded staging eligibility;
  `protocol(transactional)` retains the journalled path. Without a declaration,
  the database can propose eligible choices. Ingress/output conversion, domain
  failure and version exhaustion precede commit. Host transactions retain the
  rollback implementation. Straight-line labelled exits avoid staging closures.
- `ink-state-protocol-v1` binds the exact source. It selects action protocol,
  maintained scalar getters, changed-output publication, column prefixes and
  snapshot row caches. Every selection is replayed independently.
- `subscribeGroup` owns tuple values. `subscribeValues` has positional ownership
  and notification contracts; scalar pairs use retained value/delivery slots.
  Consumers see committed values, reentrant changes publish in subsequent passes,
  and listener errors remain isolated. Definition representations also expose
  grouped subscriptions through their ordinary ownership path.
- Column choices require an inductive source codec roundtrip. Exact Number cells
  require independently replayed 53-bit guard certificates and widen to BigInt
  outside the guard. Arithmetic remains full-width wrapping U64; this does not
  substitute Number arithmetic for an unproved aggregate range. Presence bits,
  typed columns and sparse fallback preserve insertion, deletion and ordering.
- `changeToken`, `changesSince` and `releaseChangeToken` expose owned typed net
  changes captured at actual cell writes. Failed actions discard log segments;
  host rollback/restore invalidate lineage. Logging is opt-in and absent from
  ordinary hot-path measurements. This interface belongs to source-state hosts.
- Cached snapshot rows are invalidated by writes, rollback and restore. Reuse
  charges original value/depth consumption and preserves byte limits, ordering,
  integrity and portable bytes. Complete output still must be materialized.
- `emit-protocol-ir` exposes literal allocation, read/write, failure, ownership,
  control and commit/publication operations for external planning. Structural
  facts license fixed execution machinery; algebraic alternatives remain proved
  database definitions. Hashes, observations and recipe names grant no authority.

The preflight lane currently conservatively admits a single bounded cell write
and at most one event, without reads after a possible write, arbitrary calls or
collection loops. Broader actions retain ordinary execution. Maintained getters
require admitted U64/Bool views. Column prefixes require fixed scalar records.
Selected protocol/storage capabilities are JavaScript-only; unsupported targets
reject selection explicitly. These proofs do not certify emitted JavaScript,
the target engine, or whole compiler correctness.

## Planner and lifecycle evidence

A bounded registry search admitted 24 complete implementations with 24 attempts,
11 reused proof steps and zero checker timeouts. It reached the declared state
limit, not a global optimum or fixed point. All 24 candidates passed independent
source outcomes, errors, versions, events and exact portable snapshots in three
fresh measurement processes. Training included explicit module/setup/update/
failure/checkpoint/restore weights.

The fastest measured lifecycle median was about 0.28 of the literal baseline.
However, observed sample extrema did not clear the existing 10% uncertainty guard.
The planner therefore froze the baseline; the independent holdout accepted that
frozen baseline. This is a conservative fallback, not successful automatic
selection of the fastest median. The receipt preserves every exclusion reason.
An additional frozen-candidate lifecycle recheck validates all five candidates
against both training and held-out histories in three fresh processes each.
Relative to the already maintained general map, the compiled map's weighted median
is 15% lower in training and 35% lower on the unseen histories. The 10% sample-extrema
guard still retains the general map. Number columns are slightly slower in training;
the cached kernel is 9% slower in training and 24% faster in the holdout. These are
measured medians, not authorization to override the conservative selection guard.

The physical alternatives illustrate why whole-plan selection matters: Number
compression is not the fastest update representation here. Snapshot caching also
trades memory and cold work against repeated encoding. Neither is forced as a
universal default.

## Action-native change scaling

A separate experiment includes one action/version/event plus an owned typed delta.
Its median cost is about 4.5 µs at 256 rows, 5.1 µs at 4,096 rows and 5.2 µs at
16,384 rows. A full fresh-snapshot scalar scan in that experiment takes about
15, 131 and 310 µs respectively. Input contracts differ: one receives a known
mutation, the other receives two complete fresh arrays; snapshot creation is
excluded. This demonstrates preserved change knowledge and scaling, not a
comparable Frontier patch-format win.

## Validation and reproducibility

The retained logs include 300 standalone core tests, 31 standalone JavaScript
package tests, 188 planner tests, 14 knowledge tests, source controller and
subscription tests, and the new protocol suite. The latter covers 240 source
histories across four implementations, full-width overflow/guard boundaries,
raw F32 payloads, sparse keys, exact checkpoints, forged codecs/guards, grouped
and positional traces, host rollback, reentry, owned deltas and commit exhaustion.
Mandatory C/Rust/JavaScript/both-Wasm observations and snapshots pass, with one
actual eligible GPU call and eight complete parity observations.

Raw process samples, source images, selected packets, mathematical proof closures,
compiler IR, receipts, dependency revisions and build flags accompany this report.
The optimized validation build uses command-local opt-level 2, LTO disabled,
16 codegen units and two build jobs. Production Cargo profiles are unchanged.
The optional SAT producer dependency is installed only in an ignored build folder;
the checker verifies the resulting RUP certificates without the solver.

The frozen pure corpus subset (`sequence-every`, `index-membership`,
`incremental-distinct`) also compiles under ordinary quick planning against private
knowledge copies. Two programs select alternatives, ten laws are admitted and one
law is admitted in multiple programs. Two searches reach their time bound; this
small subset is a catalogue regression check, not broad state-protocol generality
or an independent performance claim for those programs.

Changed package main revisions: JavaScript `660177d63599fa140dd81700084950263156b6a5`, knowledge `1cd9d82f2c82395e37b2d5ebd2180d893878cb82`, planner `5ef2a8b9cf9d8f3840e27b7f7d1592d637a23f88`. The distribution retains these exact pins.

The configured GitHub OAuth credential lacks workflow-write scope. GitHub rejected
the distribution push that included explicit workflow job edits. The implementation
and CPU suite inventory are published with the existing workflow unchanged; its
mandatory CPU inventory runner includes the new suite. The proposed explicit CPU/
GPU workflow additions are retained in `proposed-conformance-workflow.patch`.
Local complete-target and actual GPU runs passed. This does not claim a remote
GitHub Actions run has completed green.
