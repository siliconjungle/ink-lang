# Merged-main representation scaling, 2026-10-11

The external filtered `u64` sum/count representations are useful for repeated
reads of their cached query. They do not make checked writes generally cheap.
Handwritten maintained Rust remains substantially faster, and the delta candidate
does not consistently beat refresh. Keep direct and refresh candidates available;
these results do not justify enabling delta as a universal default.

## Exact experiment and interpretation

The clean merged-main snapshot was
`cd5ed4ad2c276eec801ed4c66c172245153a404a`, tree
`f97a3912321a12aab3ec9c378963e7956549c6bc`. The complete eight-submodule graph,
source/admission-request/driver hashes, executable hashes and toolchains are in
[provenance.json](provenance.json). Later main commits are not silently included
in these measurements. Benchmark binaries were rebuilt from this graph before
recording. Compilation measurements use the same compiler hash.

Apple M2, eight CPUs, 8 GiB RAM, macOS 26.5.2 arm64, rustc 1.96.0, Node 26.1.0.
Three independent processes per workload, with ascending, descending and shuffled
size order; the second reverses candidate order. Sizes are 48, 256, 1,024, 2,048
and 4,000 rows. Each sample executes 100 complete calls. Point cases have seven
samples per process with allocation accounting; aggregate cases have five without
accounting. Tables use the median over all 21 or 15 samples respectively.
No losing candidate or sample was discarded.

This was a shared workstation with background compiler/GUI/system load. Recorded
one-minute load averages ranged approximately 5.4–11.9 on eight CPUs, with higher
longer-window loads. Native precedes baseline and handwritten implementations
inside each sample, so within-sample ordering bias remains. Large qualitative
wins/losses are clear; close candidate rankings and precise crossover thresholds
need dedicated-machine confirmation. Preliminary dirty/concurrent runs in the
parent directory are retained for profiling history, not cross-revision ratios.

## Steady state

All values below are milliseconds per 100 calls. `baseline` is the source Ink
reference runtime. `native` is the checked Session with the literal Rust physical
definition executor. Both include complete replies/events and transaction behavior.
The independent handwritten scanner and maintained BTreeMap implementations include
complete JSON reply/event envelopes but exclude generic source ingress, schema and
snapshot validation. They are useful lower-cost comparisons, not identical host
security/validation contracts. Explicit checkpoint comparison is outside timing.

Cached sum:

| Rows | Reads | Delta native | Baseline Ink | Handwritten scan | Handwritten maintained |
|---:|---:|---:|---:|---:|---:|
| 2,048 | 100% | 0.7810 | 178.9716 | 0.4691 | 0.0215 |
| 2,048 | 90% | 26.3361 | 161.2383 | 0.4356 | 0.0355 |
| 2,048 | 50% | 125.1815 | 91.4089 | 0.2963 | 0.0759 |
| 2,048 | 10% | 261.6032 | 22.1568 | 0.1671 | 0.1166 |
| 2,048 | 0% | 279.6938 | 0.5229 | 0.1116 | 0.1085 |
| 4,000 | 100% | 1.0294 | 551.9175 | 1.1432 | 0.0328 |
| 4,000 | 90% | 61.9867 | 410.9123 | 0.9358 | 0.0412 |
| 4,000 | 10% | 659.2106 | 51.0156 | 0.2360 | 0.1324 |
| 4,000 | 0% | 651.0087 | 0.5275 | 0.1328 | 0.1265 |

Cached count:

| Rows | Reads | Delta native | Baseline Ink | Handwritten maintained |
|---:|---:|---:|---:|---:|
| 2,048 | 100% | 0.7798 | 198.4333 | 0.0223 |
| 2,048 | 90% | 27.0595 | 171.0718 | 0.0359 |
| 2,048 | 10% | 247.1614 | 20.7945 | 0.0993 |
| 2,048 | 0% | 291.1813 | 0.5359 | 0.1039 |
| 4,000 | 100% | 0.9103 | 555.4994 | 0.0343 |
| 4,000 | 90% | 71.9074 | 396.8622 | 0.0428 |
| 4,000 | 10% | 522.9804 | 41.1494 | 0.1064 |
| 4,000 | 0% | 603.3286 | 0.5874 | 0.1150 |

At 2,048 rows the sum cache wins against baseline at 90% reads and loses at 50%.
This brackets the measured crossover coarsely; it is not a universal read-ratio
threshold. With 100% reads, sum delta costs about 0.008 ms/query, versus 1.79 ms
for baseline and 0.32 ms for the direct physical representation. At 4,000 rows it
costs about 0.010 ms/query versus 5.52 ms for baseline. Write-heavy runs lose by
large margins. The count cache has the same qualitative behavior.

Direct versus refresh versus delta, cached sum at 2,048 rows:

| Reads | Direct native | Refresh native | Delta native |
|---:|---:|---:|---:|
| 100% | 32.255 | 0.720 | 0.781 |
| 90% | 50.913 | 25.368 | 26.336 |
| 50% | 131.593 | 109.777 | 125.182 |
| 10% | 259.029 | 209.376 | 261.603 |
| 0% | 298.128 | 244.959 | 279.694 |

Refresh remains competitive, and often faster here. Cached arithmetic alone is
not sufficient to select delta. Queries of the other aggregate remain direct
scans; every candidate/query/read-ratio combination is retained in
[summary.json](summary.json) and the six raw process files.

The point workload times **dynamic** get/put. Its fixed-key zero/same-key delta
laws are covered by correctness histories, but the timed queries do not exercise
that specialization. Thus it diagnoses transport/host overhead, rather than
claiming a benchmark win from fixed-key caching:

| Rows | Reads | Delta native | Baseline Ink | Handwritten Rust |
|---:|---:|---:|---:|---:|
| 2,048 | 90% | 9.587 | 0.142 | 0.050 |
| 2,048 | 10% | 71.389 | 0.227 | 0.047 |
| 4,000 | 90% | 19.284 | 0.156 | 0.054 |
| 4,000 | 10% | 155.467 | 0.246 | 0.051 |

## Checking, compilation and migration

Steady-state timing excludes admission checking, initialization and migrations.
The following phase medians are milliseconds at 2,048 rows. Checking includes
source-bound representation admission and replay of supplied proofs. The generic
migration passes through the logical state. Delta direct migrations are separately
proved definition-to-definition bridges; both paths are correctness checked.

| Aggregate candidate | Check | Initialize | Generic migration | Direct migration |
|---|---:|---:|---:|---:|
| direct | 59.346 | 11.280 | 13.297 | — |
| refresh | 133.583 | 9.409 | 57.354 | — |
| sum-delta | 1385.948 | 58.590 | 59.375 | 25.362 |
| count-delta | 1456.609 | 65.017 | 22.254 | 27.079 |

Compiler timings are three independent CLI/native compiler rounds per case,
with reversed case order in round two. CLI checking includes parsing. Checked
emission repeats checking before generating standalone Rust; it is not an
already-admitted emission-only timer. `rustc` runs separately with `-O` and thin
LTO, using prebuilt dependency rlibs. Dependency fetch/build time is excluded.
These phases do not depend on table row count. Every resulting executable ran.
Source/compiler/binary hashes and all 21 samples are in
[compilation.json](compilation.json).

| Workload / candidate | CLI check ms | Checked emission ms | rustc ms |
|---|---:|---:|---:|
| filtered-aggregate / count-delta | 1429.210 | 1595.122 | 3728.102 |
| filtered-aggregate / direct | 63.269 | 77.344 | 4696.688 |
| filtered-aggregate / refresh | 176.178 | 179.658 | 4205.508 |
| filtered-aggregate / sum-delta | 1419.084 | 1780.003 | 3851.189 |
| point-delta / delta | 194.128 | 219.054 | 4719.068 |
| point-delta / direct | 53.849 | 50.666 | 3591.450 |
| point-delta / refresh | 143.458 | 172.108 | 4063.670 |

Do not add CLI checking to checked emission as though emission excluded replay.
Standalone compilation excludes the Ink checker, source AST and Session runtime;
the steady-state table above measures the checked Session path instead. These are
separate lifecycle costs and execution contracts.

At 2,048 rows, approximately 1.5 seconds for sum-delta admission plus initialization
and generic migration would amortize over roughly 850 baseline scan queries, or
roughly 4,800 direct-physical scan queries, at the measured pure-read rates.
This illustrative calculation excludes compilation, uses no writes and combines
medians under shared load. Deployment-specific break-even must include applicable
build/bridge costs and actual query/write mix.

## Largest measured costs and the implemented fix

The initial full-constructor transport repeatedly encoded/copied the physical
state and transported full logical snapshots on reads. The runtime now retains
immutable typed physical state between invocations, executes against prepared
state, validates changed private storage before publication, and reuses validated
unchanged storage by constructor/scalar equality and child Arc identity. Read-only
source queries return compact logical observations: publication requires unchanged
commit/version and no events. Invalid read-only observations fail without publishing.
No source syntax or snapshot container version changed.

The transport is flat postorder with explicit limits: 100,000 nodes, depth 8,192,
64 fields/arguments and 16 MiB. Aliased, forward and unused nodes are rejected.
The separate definition machine allows at most 2 million work units and 16,000
frames. Source fixture bounds remain 4,096 rows; 4,000 leaves room for insertions.
Proof limits remain explicit, including 20 million RUP work and 20,000 steps.
These changes permit the formerly blocked 2,048-row experiment and 4,000-row runs
without removing resource bounds.

Writes still process the logical state. The allocation-instrumented dynamic-point
case at 4,000 rows and 10% reads reports these median stages per 100 calls:

| Stage | ms | Allocation requests | Requested bytes |
|---|---:|---:|---:|
| inputs | 0.050 | 390 | 24,680 |
| execute | 68.007 | 1,810,390 | 279,956,900 |
| decode | 6.620 | 1,840 | 46,733,820 |
| validate | 27.396 | 1,800 | 17,437,680 |
| publish | 18.394 | 700 | 129,420 |

Requested bytes are cumulative allocation traffic, not peak live memory. Stages
are one separately profiled history per process, not the same samples as pooled
wall timing, so their medians need not sum to wall time. Execution remains largest:
linked-list traversal and construction of complete logical observations, followed
by schema/snapshot validation and publication/drop of replaced state. The allocation
profile is whole-stage evidence, not an instruction-level allocator flamegraph.
The retained-state/read-only fix removes repeated physical term round trips and
read snapshots; it does not make linked-list writes or full logical validation
constant time. Efficient indexed physical definitions and finer-grained checked
write observations remain worthwhile follow-up work.

## Correctness and backend coverage

Filtered sum/count insert, replacement, removal, duplicate-key handling, failed
updates, rollback, restore and generic/direct migration are ordinary external
knowledge definitions/proofs checked by the general checker. The producer is
untrusted. Word extensionality is a general checker mechanism; no aggregate-name
whitelist or trusted optimization theorem was introduced.

Numerical correspondence now includes scoped exact integers, u32/i32 arithmetic
and total division/remainder, binary32 per-operation rounding, fixed vectors,
stored equality and captured pure map/filter/foldr closures. All representation
fixtures share seven execution routes: Rust, C, JavaScript, C-Wasm, Rust-Wasm,
native GPU host and browser GPU host. The same complete histories, rollback,
events, restore/counter exhaustion and snapshots are compared across these routes.
Binary32 includes an adversarial multiply-add test that detects accidental fusion.
Scalar Bool/u64 physical storage has the same coverage.

Recursive representations use GPU **host** execution; this is equal observable
coverage, not a claim of recursive device shaders. Standalone entrypoints trust
caller-provided typed state, with explicit checkpoint/restore validation. The
checked Session validates host boundaries separately. Unsupported strings,
non-u64 table keys and advanced operators continue to fail closed to baseline;
see [the precise source scope](../../../docs/database-representations.md).
Arithmetic NaN payload identity follows the disclosed float contract.

Local validation included all 71 isolated core tests, five bit-proof integration
tests, eight literal-definition tests, runtime policy/durability tests, all seven
representation fixture groups across all seven routes, standalone independence
and snapshot tests, aggregate histories and negative read-only publication tests.
CI additionally found stale rejection expectations for newly supported source
constructs and a Rust nominal-ID wire parser accepting short hexadecimal input.
The expectations were corrected; the parser fix retains 32-digit checking and
adversarial rejection histories without changing these benchmark fixtures.

## Reproduction

Use the archived root commit and exact submodule revisions, rebuild the disposable
knowledge index, and build the release compiler. Generate the native drivers:

```sh
git checkout cd5ed4ad2c276eec801ed4c66c172245153a404a
git submodule update --init --recursive
(cd knowledge && python3 -m ink_knowledge --root . rebuild)
cargo build --locked --release --bins --lib
cargo test --release --test point_delta benchmark_representation_scaling -- --ignored --nocapture
cargo test --release --test point_delta benchmark_aggregate_scaling -- --ignored --nocapture
```

The original recorder requires a clean checkout equal to fetched `origin/main`.
To record a fresh **current-main** experiment, fetch/checkout main, regenerate
every binary with the commands above, then run:

```sh
python3 bench/point-delta/run_scaling.py --point build/point-delta-benchmark/native --aggregate build/aggregate-rust/native --compiler target/release/ink --output /tmp/ink-main-scaling
python3 bench/point-delta/scaling_compile.py --compiler target/release/ink --output /tmp/ink-main-scaling/compilation.json
python3 bench/point-delta/summarise_scaling.py /tmp/ink-main-scaling
```

To replay the archived binaries after rebuilding at the recorded commit, run
`build/point-delta-benchmark/native` and `build/aggregate-rust/native` directly
with `INK_BENCH_ROWS=48,256,1024,2048,4000`; repeat with the two other size orders
in provenance and `INK_BENCH_REVERSE=1` on the descending run. Archive each stdout
JSON. This bypasses only the recorder's current-main assertion, not driver correctness
checks or resource limits. Compilation and summarization commands work against
these archived inputs as well. Fresh main runs will have different provenance.
Backend conformance
uses `cargo test --test representation_parity --test standalone_representation`;
set `INK_TEST_ZIG` to the cross compiler for C-Wasm. The full CPU and actual-device
CI commands are in `.github/workflows/conformance.yml`. Do not interpret a host lane
or an allocation-instrumented point run as device performance evidence.
