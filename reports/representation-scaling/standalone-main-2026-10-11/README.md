# Ordinary compiled Ink after Session removal

Measured merged main [`ee293779`](https://github.com/siliconjungle/ink-lang/commit/ee293779e12687a610263a9dd4d8f4f12a3c4d52). The generic stateful representation executor and its research adapters are removed. These measurements use ordinary generated Rust state; historical generic-executor timings remain archived and do not establish a cross-revision speedup ratio.

## Execution contract and measurement

Five sizes (48, 256, 1,024, 2,048 and 4,000 rows), four checked candidates (direct, refresh, sum delta and count delta), two filtered queries, and five read/write mixes. Three independent processes rotate size/candidate order; each case has fifteen samples of 100 calls. Samples include insertion, replacement, removal and active-filter changes. Complete structured JSON replies, events and acknowledgement are timed. Inputs are already typed and reply serialization is excluded equally. Every sample agrees with the source baseline and both independently written Rust implementations; exact final snapshots are checked outside timing.

Production calls contain no Ink runtime/checker references and do not encode logical snapshots. The benchmark harness links the source runtime for comparison and outside-loop setup only. The scanner uses BTreeMap and recomputes the aggregate; the maintained implementation updates its own sum/count. Initialization, migration, checking, compilation and snapshot comparison are outside steady state. Executor order within each sample is fixed, and the host is shared with other tasks; loads and exact input/source/binary/toolchain hashes are recorded in [provenance](provenance.json). No allocation instrumentation was active.

## Steady state at 4,000 rows

Milliseconds per 100 complete calls; medians of all fifteen samples. All sizes, candidates and losing cases are in [summary.json](summary.json) and the three raw process files.

| Candidate | Query | Reads | Compiled Ink | Baseline Ink | Rust scanner | Rust maintained |
|---|---|---:|---:|---:|---:|---:|
| direct | total_query | 100% | 92.5968 | 256.3811 | 0.6102 | 0.0169 |
| direct | total_query | 90% | 89.1582 | 234.5895 | 0.5926 | 0.0246 |
| direct | total_query | 50% | 83.7086 | 155.0845 | 0.3833 | 0.0494 |
| direct | total_query | 10% | 51.9301 | 29.1104 | 0.1414 | 0.0659 |
| direct | total_query | 0% | 44.3847 | 0.3818 | 0.0810 | 0.0685 |
| sum-delta | total_query | 100% | 0.0148 | 235.5554 | 0.5856 | 0.0166 |
| sum-delta | total_query | 90% | 11.1045 | 209.3374 | 0.5296 | 0.0228 |
| sum-delta | total_query | 50% | 52.9042 | 117.0346 | 0.3388 | 0.0463 |
| sum-delta | total_query | 10% | 95.0916 | 24.4174 | 0.1280 | 0.0673 |
| sum-delta | total_query | 0% | 105.8725 | 0.3478 | 0.0775 | 0.0668 |
| direct | count_query | 100% | 104.8726 | 300.7875 | 0.7202 | 0.0204 |
| direct | count_query | 90% | 92.4700 | 254.7340 | 0.6002 | 0.0253 |
| direct | count_query | 50% | 69.8495 | 131.4863 | 0.3517 | 0.0462 |
| direct | count_query | 10% | 47.4166 | 26.7333 | 0.1343 | 0.0620 |
| direct | count_query | 0% | 43.4706 | 0.3796 | 0.0843 | 0.0708 |
| count-delta | count_query | 100% | 0.0143 | 266.5013 | 0.6287 | 0.0163 |
| count-delta | count_query | 90% | 11.0346 | 232.5694 | 0.6362 | 0.0231 |
| count-delta | count_query | 50% | 59.4310 | 132.1969 | 0.3790 | 0.0471 |
| count-delta | count_query | 10% | 99.8177 | 26.7719 | 0.1261 | 0.0673 |
| count-delta | count_query | 0% | 106.6025 | 0.3571 | 0.0820 | 0.0712 |

Cached reads avoid traversing the physical rows. Writes still run the checked linked-list definitions and their allocation/copying work; removing the generic executor does not make those updates constant-time. The maintained handwritten implementation is the appropriate comparison for an incremental candidate. Direct and refresh candidates remain measured even when they lose.

## Separate phases

Portable migration is checkpoint/restore into the next compiled variant, with publication only after restore succeeds. Direct research bridge execution was retired with the generic executor; universal direct-bridge preservation proofs remain checkable. Migration preserves logical snapshot bytes, source/schema identity, versions and pending events.

| From | To | Restore at 4,000 rows (ms) | Portable migration (ms) |
|---|---|---:|---:|
| count-delta | direct | 2.329 | 2.165 |
| direct | refresh | 1.127 | 2.909 |
| refresh | sum-delta | 1.920 | 2.811 |
| sum-delta | count-delta | 1.998 | 2.762 |

Three separately timed CLI/compiler samples per candidate; dependencies are prebuilt and excluded from rustc timing. CLI check includes parsing and proof checking. CLI emission repeats checking, so it is not pure emitter time and must not be subtracted from a different checking sample. [Compilation raw data](compilation.json) records source/binary hashes. These phase observations were prepared just before merging, with identical compiler/input/driver bytes to the measured main. The separate harness build in [artifact-preparation.json](artifact-preparation.json) includes dependencies and the baseline harness, and is not standalone rustc timing.

| Workload | Candidate | CLI check (ms) | CLI checked emission (ms) | Standalone rustc (ms) |
|---|---|---:|---:|---:|
| point-delta | direct | 64.689 | 50.242 | 3894.765 |
| point-delta | refresh | 160.177 | 237.648 | 4240.297 |
| point-delta | delta | 169.955 | 185.491 | 5302.835 |
| filtered-aggregate | direct | 59.240 | 68.290 | 4073.529 |
| filtered-aggregate | refresh | 175.134 | 157.042 | 4251.958 |
| filtered-aggregate | sum-delta | 1916.621 | 1839.195 | 4183.438 |
| filtered-aggregate | count-delta | 1538.105 | 2070.057 | 5241.474 |

## Boundaries and validation

Ink syntax and the proof kernel are unchanged. General representation/source binding, all-action preservation, migration checking and explicit snapshot codec limits remain. CLI compile-and-run requires Cargo and cached ordinary dependencies; generated applications remain standalone. CLI request/script/snapshot inputs and reply output are bounded to 16 MB, scripts to 100,000 steps, and compiled bundles to 16 variants; source ingress keeps depth 32, collection length 4,096 and Int magnitude 4,090 bits. Benchmark rows are capped at 4,000 with room for its insertions. Ordinary compiled entrypoints retain their caller-trusted typed/canonical-input contract; no old generic transport bounds are claimed for native calls.

[Validation logs](validation/) retain ten adversarial/compiled migration tests, selection rechecking, generated CPU and both Wasm histories, all eight parity groups across seven standalone routes, three standalone histories, the twelve GPU-host integration tests, an independent runtime build and all 41 runtime Node tests. GPU-host artifact tests here validate module compilation and execution; their logs disclose zero eligible device calls. Actual device-dispatch coverage is a separate CI job, not implied by those host tests.

Reproduce from the recorded graph:

```sh
cargo build --release --bin ink --locked
cargo test --test point_delta benchmark_standalone_aggregate_scaling -- --ignored
python3 bench/point-delta/run_scaling.py --binary build/standalone-aggregate-benchmark/target/release/ink-standalone-aggregate-benchmark --output reports/representation-scaling/standalone-main-2026-10-11
python3 bench/point-delta/summarise_scaling.py reports/representation-scaling/standalone-main-2026-10-11
python3 bench/point-delta/scaling_compile.py --compiler target/release/ink --output reports/representation-scaling/standalone-main-2026-10-11/compilation.json
```

The runner requires a clean checkout at fetched main and exact submodule pins. These commands record a new current-main experiment. For historical reproduction, build at the recorded commit, invoke the generated binary with the recorded INK_BENCH_ROWS/INK_BENCH_REVERSE process order, and verify the archived source/input hashes. Compilation needs a release Ink CLI built with the same graph.
